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
import requests
import ffmpeg
import os
from dotenv import load_dotenv

from colorama import Fore, Back, Style

if not os.path.isdir('tmp'):
    os.makedirs('tmp', exist_ok=True)

host = os.environ.get("HOST_ADDR")
# host = "ketiair.com"
host_port = os.environ.get("HOST_PORT")
# host_port = 28443

load_dotenv()
recognize_url = "https://kakaoi-newtone-openapi.kakao.com/v1/recognize"
keti_url = f"https://{host}:{host_port}/talk"
synthesize_url = "https://kakaoi-newtone-openapi.kakao.com/v1/synthesize"
rest_api_key = os.environ.get("API_KEY")
headers_recog = {
    "Content-Type": "application/octet-stream",
    "Authorization": "KakaoAK " + rest_api_key,
}
headers_keti = {"Content-type": "application/json", "Accept": "text/plain"}
headers_synth = {
    "Content-Type": "application/xml",
    "Authorization": "KakaoAK " + rest_api_key,
}

port = os.environ.get("SERVICE_PORT")
record_video = False
flag = True

ROOT = os.path.dirname(__file__)

logger = logging.getLogger("pc")

pcs = set()



class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    PURPLE = '\033[35m'

    @staticmethod
    def get_msg(msg, logtype=None):
        if logtype is None:
            return msg
        else:
            return logtype+msg+bcolors.ENDC
    
    @staticmethod
    def get_info(msg):
        return bcolors.get_msg(msg, bcolors.BOLD)
    
    @staticmethod
    def get_warning(msg):
        return bcolors.get_msg(msg, bcolors.WARNING)
    
    @staticmethod
    def get_fail(msg):
        return bcolors.get_msg(msg, bcolors.FAIL)
    
    @staticmethod
    def get_okgreen(msg):
        return bcolors.get_msg(msg, bcolors.OKGREEN)
    
    @staticmethod
    def get_okblue(msg):
        return bcolors.get_msg(msg, bcolors.OKBLUE)





def debug_print(msg):
    print(Fore.RED + Back.GREEN + msg + Style.RESET_ALL)


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


# async def index(request):
#     content = open(os.path.join(ROOT, "index.html"), "r").read()
#     return web.Response(content_type="text/html", text=content)


async def talk(request):
    dict_in = await request.json()
    text_in = dict_in["text"]
    base64_in_split = dict_in["audio"].split("data:audio/webm; codecs=opus;base64,", 1)
    

    emotion = "happy"

    #base64_in = dict_in["audio"].split("data:audio/webm; codecs=opus;base64,", 1)[1]
    if len(base64_in_split) > 1 and len(base64_in_split[1])>0:
        base64_in = base64_in_split[1]
        uid_in = dict_in["uid"]
        webm_in = base64.b64decode(base64_in)

        temp_file_webm = "tmp/{}.webm".format(uid_in)
        temp_file_wav = "tmp/{}.wav".format(uid_in)

        # save audio data
        print(bcolors.get_fail("[{}]Write webm file: {}".format(uid_in, temp_file_webm)))
        if os.path.isfile(temp_file_webm):
            os.remove(temp_file_webm)

        with open(temp_file_webm, "wb") as f:
            f.write(webm_in)

        if os.path.isfile(temp_file_wav):
            os.remove(temp_file_wav)

        # convert webm (48 khz, 32 bits, 1 channel, opus) to wav (16 khz, 16 bits, 1 channel, pcm)
        stream = ffmpeg.input(temp_file_webm)
        stream = ffmpeg.output(stream, temp_file_wav, ar=16000)
        ffmpeg.run(stream, overwrite_output=True)

        #######
        # STT #
        #######
        with open(temp_file_wav, "rb") as f:
            recog_in = f.read()
        res_stt = requests.post(recognize_url, headers=headers_recog, data=recog_in)
        if res_stt.raise_for_status():
            debug_print("REST API ERR: {}".format(res_stt.raise_for_status()))

        try:
            result_stt_json_str = res_stt.text[
                res_stt.text.index('{"type":"finalResult"') : res_stt.text.rindex("}") + 1
            ]
            debug_print("STT result: {}".format(result_stt_json_str))
            result_stt = json.loads(result_stt_json_str)
        except Exception as e:
            result_stt = {"value": "다시 말씀해주시겠어요?"}
            debug_print("Exception")
            print(e)

        #########
        # KETI #
        #########
        result_stt = {}
        # result_stt["audio"] = base64.b64encode(recog_in).decode("ascii")
        result_stt["audio"] = base64_in
        result_stt["text"] = text_in
        result_stt["uid"] = uid_in
        try:
            keti_data = requests.post(
                keti_url, headers=headers_keti, data=json.dumps(result_stt), verify=False
            )
            keti_data.raise_for_status()  # raise an exception
            keti_in = keti_data.json()
            tts_in = keti_in["text"]
            emotion = keti_in["emotion"]
        except Exception as e:
            tts_in = "서버와의 연결을 확인하세요"
            debug_print("Exception")
            print(e)
    else:
        tts_in = "GNICT의 voice chat에서 넘어온 음성 데이터가 존재하지 않습니다."

    #######
    # TTS #
    #######
    try:
        synth_in = (
            f"<speak> <voice name='WOMAN_DIALOG_BRIGHT'> {tts_in} </voice> </speak>".encode(
                "utf-8"
            )
        )

        res_tts = requests.post(synthesize_url, headers=headers_synth, data=synth_in)
        if res_tts.raise_for_status():
            debug_print("REST API ERR: {}".format(res_tts.raise_for_status()))

        temp_file_mp3 = "tmp/{}.mp3".format(uid_in)
        if os.path.isfile(temp_file_mp3):
            os.remove(temp_file_mp3)

        with open(temp_file_mp3, "wb") as f:
            f.write(res_tts.content)
        
        print(bcolors.get_fail("[{}]Write mp3 file: {}".format(uid_in, temp_file_mp3)))
    except Exception as e:
        print(bcolors.get_fail("[{}] Error: {}".format(uid_in, temp_file_mp3)))
        temp_file_mp3 = "error.mp3"

    # convert mp3 (1 channel) to webm (24 khz, 32 bits, 1 channel, opus)
    stream = ffmpeg.input(temp_file_mp3)
    stream = ffmpeg.output(stream, temp_file_webm)
    ffmpeg.run(stream, overwrite_output=True)

    with open(temp_file_webm, "rb") as f:
        webm_out = f.read()

    ##############################
    # Response with emotion data #
    ##############################
    print(bcolors.get_fail("[{}]webm_out: {}".format(uid_in, len(webm_out))))
    base64_out = "data:audio/webm; codecs=opus;base64," + base64.b64encode(
        webm_out
    ).decode("ascii")


    print(bcolors.get_fail("[{}]Write mp3 file: {}".format(uid_in, temp_file_mp3)))
    dict_out = dict({"audio": base64_out, "emotion": emotion, "text": tts_in})
    return web.json_response(dict_out)


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
            local_video = VideoTransformTrack(
                track, transform=params["video_transform"]
            )
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
            # web.get("/", index),
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
