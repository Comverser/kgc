import argparse
import asyncio
import json
import logging
import os
import ssl
import uuid

import cv2
from aiohttp import web
import aiohttp_cors
from av import VideoFrame

from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole, MediaRecorder, MediaPlayer

# voice processing
import base64
import ffmpeg
import time

flag = True

ROOT = os.path.dirname(__file__)

logger = logging.getLogger("pc")
hshin = logging.getLogger("HS")  # HShin
pcs = set()

settings = {
    "recordVideo": False,
    "useDatachannel": False,
    "useAudio": False,
    "useVideo": True,
    "useStun": False,
    "datachannelParameters": '{"ordered": true}',
    "audioCodec": "default",
    "videoCodec": "H264/90000",
    "videoResolution": "320x240",
    "videoTransform": "none",
}


def log_debug(msg):
    hshin.info(f"\033[93m{msg}\033[0m")


class VideoTransformTrack(MediaStreamTrack):
    """
    A video stream track that transforms frames from an another track.
    """

    kind = "video"

    def __init__(self, track, transform):
        super().__init__()  # don't forget this!
        self.track = track
        self.transform = transform

    async def recv(self):
        frame = await self.track.recv()

        if self.transform == "cartoon":
            img = frame.to_ndarray(format="bgr24")

            # prepare color
            img_color = cv2.pyrDown(cv2.pyrDown(img))
            for _ in range(6):
                img_color = cv2.bilateralFilter(img_color, 9, 9, 7)
            img_color = cv2.pyrUp(cv2.pyrUp(img_color))

            # prepare edges
            img_edges = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            img_edges = cv2.adaptiveThreshold(
                cv2.medianBlur(img_edges, 7),
                255,
                cv2.ADAPTIVE_THRESH_MEAN_C,
                cv2.THRESH_BINARY,
                9,
                2,
            )
            img_edges = cv2.cvtColor(img_edges, cv2.COLOR_GRAY2RGB)

            # combine color and edges
            img = cv2.bitwise_and(img_color, img_edges)

            # rebuild a VideoFrame, preserving timing information
            new_frame = VideoFrame.from_ndarray(img, format="bgr24")
            new_frame.pts = frame.pts
            new_frame.time_base = frame.time_base
            return new_frame
        elif self.transform == "edges":
            # perform edge detection
            img = frame.to_ndarray(format="bgr24")
            img = cv2.cvtColor(cv2.Canny(img, 100, 200), cv2.COLOR_GRAY2BGR)

            # rebuild a VideoFrame, preserving timing information
            new_frame = VideoFrame.from_ndarray(img, format="bgr24")
            new_frame.pts = frame.pts
            new_frame.time_base = frame.time_base
            return new_frame
        elif self.transform == "rotate":
            # rotate image
            img = frame.to_ndarray(format="bgr24")
            rows, cols, _ = img.shape
            M = cv2.getRotationMatrix2D((cols / 2, rows / 2), frame.time * 45, 1)
            img = cv2.warpAffine(img, M, (cols, rows))

            # rebuild a VideoFrame, preserving timing information
            new_frame = VideoFrame.from_ndarray(img, format="bgr24")
            new_frame.pts = frame.pts
            new_frame.time_base = frame.time_base
            return new_frame
        else:
            return frame


async def index(request):
    content = open(os.path.join(ROOT, "index.html"), "r").read()
    return web.Response(content_type="text/html", text=content)


async def get_settings(request):
    data = {
        "useDatachannel": settings["useDatachannel"],
        "useAudio": settings["useAudio"],
        "useVideo": settings["useVideo"],
        "useStun": settings["useStun"],
        "datachannelParameters": settings["datachannelParameters"],
        "audioCodec": settings["audioCodec"],
        "videoCodec": settings["videoCodec"],
        "videoResolution": settings["videoResolution"],
        "videoTransform": settings["videoTransform"],
    }
    return web.json_response(data)


async def post_settings(request):
    params = await request.json()
    settings["recordVideo"] = params["recordVideo"]  # local setting
    settings["useDatachannel"] = params["useDatachannel"]
    settings["useAudio"] = params["useAudio"]
    settings["useVideo"] = params["useVideo"]
    settings["useStun"] = params["useStun"]
    settings["datachannelParameters"] = params["datachannelParameters"]
    settings["audioCodec"] = params["audioCodec"]
    settings["videoCodec"] = params["videoCodec"]
    settings["videoResolution"] = params["videoResolution"]
    settings["videoTransform"] = params["videoTransform"]

    return web.json_response(settings)


async def post_talk(request):
    dict_in = await request.json()
    base64_in = dict_in["audio"].split("data:audio/webm; codecs=opus;base64,", 1)[1]
    webm_in = base64.b64decode(base64_in)
    
    temp_file_webm = "temp.webm"
    temp_file_wav = "temp.wav"

    # save audio data
    with open(temp_file_webm, "wb") as f:
        f.write(webm_in)
    
    # convert webm to wav
    stream = ffmpeg.input(temp_file_webm)
    stream = ffmpeg.output(stream, "temp.wav", ar=16000)
    ffmpeg.run(stream, overwrite_output=True)
    
    # STT

    # Model
    print("AI model predicting...")

    # TTS


    # convert wav to webm
    stream = ffmpeg.input(temp_file_wav)
    stream = ffmpeg.output(stream, temp_file_webm, ar=48000)
    ffmpeg.run(stream, overwrite_output=True)
    with open(temp_file_webm, 'rb') as f:
        webm_out = f.read()

    # Response with emotion data
    base64_out = "data:audio/webm; codecs=opus;base64," + base64.b64encode(
        webm_out
    ).decode("ascii")
    global flag
    flag = not flag
    if flag:
        dict_out = dict({"audio": base64_out, "emotion": "happy", 'text': '안녕하세요'})
    else:
        dict_out = dict({"audio": base64_out, "emotion": "surprise", 'text': '반갑습니다'})
    return web.json_response(dict_out)


async def offer(request):
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pc_id = f"PeerConnection({uuid.uuid4()})"
    pcs.add(pc)
    log_debug(pcs)

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
            if settings["recordVideo"]:
                pc.addTrack(player.audio)
                recorder.addTrack(track)
            else:
                pc.addTrack(track)

        elif track.kind == "video":
            local_video = VideoTransformTrack(
                track, transform=params["video_transform"]
            )
            if settings["recordVideo"]:
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
    log_debug("before???????????????")
    await asyncio.gather(*coros)
    pcs.clear()
    log_debug("after?????????????????")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="WebRTC audio / video / data-channels demo"
    )
    parser.add_argument(
        "--cert-file", default="cert/cert.pem", help="SSL certificate file (for HTTPS)"
    )
    parser.add_argument(
        "--key-file", default="cert/key.pem", help="SSL key file (for HTTPS)"
    )
    parser.add_argument(
        "--port", type=int, default=8080, help="Port for HTTP server (default: 8080)"
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
            web.get("/", index),
            web.post("/offer", offer),
            web.post("/settings", post_settings),
            web.get("/settings", get_settings),
            web.post("/talk", post_talk),
        ]
    )
    app.router.add_static("/", path="static")

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

    web.run_app(app, access_log=None, port=args.port, ssl_context=ssl_context)
