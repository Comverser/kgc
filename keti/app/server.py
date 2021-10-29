import argparse
import asyncio
import json
import logging
import os
import queue
import ssl
import time
import pickle
import threading

import uuid
import base64
import requests
from urllib.parse import urljoin

import grpc
import nipa_service_pb2 as npb
import nipa_service_pb2_grpc as ngrpc

import videoencoder

import numpy as np
#import cv2
from aiohttp import web
import aiohttp_cors
from av import VideoFrame

from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole, MediaRecorder, MediaPlayer, MediaRelay

ROOT = os.path.dirname(__file__)

logger = logging.getLogger("pc")
pcs = set()
relay = MediaRelay()

#port = 28443
port = os.environ.get("SERVICE_PORT")
record_video = False


demo_main_url = os.environ.get("DEMO_MAIN_URL")
#demo_main_url = '10.1.108.4:5000'
ngrpc_channel = grpc.insecure_channel(demo_main_url)
ngrpc_stub = ngrpc.StreamingServiceStub(
    ngrpc_channel)

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    IMPORTANT = '\033[35m'

class VideoTransformTrack(MediaStreamTrack):
    """
    A video stream track that transforms frames from an another track.
    """

    kind = "video"

    def __init__(
            self, 
            track, 
            uid='sane',
            width=640,
            height=480,
            bitrate=1000000,
            iframeinterval=30,
            framerate=30,
            verbose=True):
        super().__init__()  # don't forget this!
        self.track = track
        self.uid = uid

        self.verbose=verbose
        self.frame_num = 0

        # msg queue
        self.msg_queue = queue.Queue()
        self.stop_event = threading.Event()

        self.codec = videoencoder.create_codec(
            "h264", "bgr24", width, height, bitrate, iframeinterval, framerate)
        
        self.t = threading.Thread(target=self.msg_thread)
        self.t.start()
    
    def log(self, msg, logtype=None):
        if self.verbose:
            if logtype is None:
                logger.info(msg)
            else:
                logger.info(logtype+msg+bcolors.ENDC)
    
    def create_generator(self):
        try:
            while not self.stop_event.is_set():
                time.sleep(0.01)
                if not self.msg_queue.empty():
                    yield self.msg_queue.get()
            logger.warning('[stop generator] [uid: {}]'.format(self.uid))
        except Exception as e:
            logger.warning('[generator exception] [uid: {}] {}'.format(self.uid, e))

    # relay image
    def msg_thread(self):
        try:
            logger.info('create message thread: uid: {}'.format(self.uid))
            responses = ngrpc_stub.ImageStreaming(
                self.create_generator())
            for item in responses:
                time.sleep(0.01)
                if self.stop_event.is_set():
                    self.log('{}'.format('stop event'), bcolors.FAIL)
                    break
            logger.warning('[stop thread] [uid: {}]'.format(self.uid))
        except Exception as e:
            logger.warning('[except in message thread] [uid: {}] {}'.format(self.uid, e))

    
    async def recv(self):
        frame = await self.track.recv()

        img = frame.to_ndarray(format="bgr24")

        # cv2.imwrite("img.jpg", img)

        res = videoencoder.push_frame_data(self.codec, img.tobytes())

        if res is not None:
            msg = npb.ImgRequest(
                uid=self.uid, 
                orientation=0, 
                frame=res, 
                frame_num=self.frame_num)
            self.frame_num += 1
            self.msg_queue.put(msg)

        return frame
    
    async def stop_thread(self):
        self.log('{}'.format('stop event'), bcolors.FAIL)
        self.stop_event.set()
    
    def __del__(self):
        del self.codec
        logger.warning('Destructor called, VideoTransformTrack for {} deleted.'.format(self.uid))


async def talk(request):
    print("-----[KETI AI MODEL]-----")
    speech_data_in = await request.json()
    print(f"speech_data_in['text']: {speech_data_in['text']}")
    print(
        f"speech_data_in['audio'][:100]: {speech_data_in['audio'][:100]}"
    )  # OPUS/BASE64

    uid = speech_data_in['uid']
    msg = speech_data_in["text"]
    audio = speech_data_in['audio']

    response = ngrpc_stub.Chat(npb.ChatRequest(
                                    uid=uid, 
                                    text=msg, 
                                    audio=audio
                                    ))
    data = pickle.loads(response.result)

    speech_data_out = data["text"]
    speech_data_out_emotion = data["emotion"]
    print("#"*20 + "\nuid: " + uid+ "#"*20 +"\n")
    print(f"speech_data_in: {msg}")
    print(f"speech_data_out: {speech_data_out}")
    return web.json_response({
        "text": speech_data_out,
        "emotion": speech_data_out_emotion})


async def offer(request):
    params = await request.json()
    uid = params["uid"]
    print("#"*20 + "\nuid: " + uid+ "\n" + "#"*20 +"\n")

    local_video = None
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pc_id = f"PeerConnection({uuid.uuid4()})"
    pcs.add(pc)

    def log_info(msg, *args):
        logger.info(f"\033[35m{pc_id}:{msg}\033[0m", *args)

    log_info("Created for %s", request.remote)

    # prepare local media
    player = MediaPlayer(os.path.join(ROOT, "server-sent-demo.wav"))
    if args.write:
        recorder = MediaRecorder(args.write)
    else:
        recorder = MediaBlackhole()

    @pc.on("datachannel")
    def on_datachannel(channel):
        @channel.on("message")
        def on_message(message):
            if isinstance(message, str) and message.startswith("ping"):
                channel.send("pong" + message[4:])

    @pc.on("iceconnectionstatechange")
    async def on_iceconnectionstatechange():
        log_info("ICE connection state is %s", pc.iceConnectionState)
        if pc.iceConnectionState == "failed":
            await pc.close()
            pcs.discard(pc)

    @pc.on("track")
    def on_track(track):
        log_info("Track %s received", track.kind)

        if track.kind == "audio":
            if record_video:
                pc.addTrack(player.audio)
                recorder.addTrack(track)
            else:
                pc.addTrack(track)

        elif track.kind == "video":
            local_video = VideoTransformTrack(
                relay.subscribe(track),
                uid=uid)
            pc.addTrack(local_video)
            if record_video:
                recorder.addTrack(relay.subscribe(track))

        @track.on("ended")
        async def on_ended():
            log_info("Track %s ended", track.kind)
            if local_video is not None:
                await local_video.stop_thread()
            await recorder.stop()

    # handle offer
    await pc.setRemoteDescription(offer)
    await recorder.start()

    # send answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return web.Response(
        content_type="application/json",
        text=json.dumps(
            {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
        ),
    )


async def on_shutdown(app):
    # close peer connections
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WebRTC audio / video / data-channels")
    parser.add_argument(
        "--cert-file", default="cert/cert.pem", help="SSL certificate file (for HTTPS)"
    )
    parser.add_argument(
        "--key-file", default="cert/key.pem", help="SSL key file (for HTTPS)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=port,
        help=f"Port for HTTP server (default: {port})",
    )
    parser.add_argument("--verbose", "-v", action="count")
    parser.add_argument(
        "--write", default="video-saved.mp4", help="Write received video to a file"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    if args.cert_file:
        # HTTPS
        ssl_context = ssl.SSLContext()
        ssl_context.load_cert_chain(args.cert_file, args.key_file)
    else:
        # HTTP
        ssl_context = None

    app = web.Application()
    app.on_shutdown.append(on_shutdown)

    app.router.add_routes(
        [
            web.post("/offer", offer),
            web.post("/talk", talk),
        ]
    )

    # Configure default CORS settings.
    cors = aiohttp_cors.setup(
        app,
        defaults={
            "*": aiohttp_cors.ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*",
            )
        },
    )

    # Configure CORS on all routes.
    for route in list(app.router.routes()):
        cors.add(route)

    web.run_app(app, access_log=None, port=args.port, ssl_context=ssl_context)  # HTTPS
