import argparse
import asyncio
import json
import logging
import os
import ssl

import uuid
import base64
import requests
from urllib.parse import urljoin

import numpy as np
import cv2
from aiohttp import web
import aiohttp_cors
from av import VideoFrame

from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole, MediaRecorder, MediaPlayer

ROOT = os.path.dirname(__file__)

logger = logging.getLogger("pc")
pcs = set()


port = 28443
record_video = False

demo_main_url = 'http://10.1.92.1:5000/'
demo_task_q = '/api/task'
demo_image_task_q = '/api/image'
demo_headers = {'Content-Type': 'application/json; charset=utf-8'} # optional


class VideoTransformTrack(MediaStreamTrack):
    """
    A video stream track that transforms frames from an another track.
    """

    kind = "video"

    def __init__(self, track):
        super().__init__()  # don't forget this!
        self.track = track
    
    def send(self, img):
        binary_cv = cv2.imencode('.jpg', img)[1].tobytes()
        base_in = base64.b64encode(binary_cv)
        data = json.dumps(
            {'img': base_in.decode('utf-8')}
        )
        print('send image')
        response = requests.post(urljoin(demo_main_url, demo_image_task_q), data=data, headers=demo_headers)
        print('receive image')

    async def recv(self):
        frame = await self.track.recv()

        img = frame.to_ndarray(format="bgr24")
        self.send(img)

        return frame


async def talk(request):
    print("-----[KETI AI MODEL]-----")
    speech_data_in = await request.json()
    print(f"speech_data_in['text']: {speech_data_in['text']}")
    print(
        f"speech_data_in['audio'][:100]: {speech_data_in['audio'][:100]}"
    )  # OPUS/BASE64
    speech_data_out = speech_data_in["text"]
    print(f"speech_data_out: {speech_data_out}")
    return web.json_response(speech_data_out)


async def offer(request):
    params = await request.json()
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
            local_video = VideoTransformTrack(track)
            if record_video:
                recorder.addTrack(local_video)
            else:
                pc.addTrack(local_video)

        @track.on("ended")
        async def on_ended():
            log_info("Track %s ended", track.kind)
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
