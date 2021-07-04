import os
from dotenv import load_dotenv
load_dotenv()


# ---------------------------------------#
import requests
import json
import ffmpeg

recognize_url = "https://kakaoi-newtone-openapi.kakao.com/v1/recognize"
synthesize_url = "https://kakaoi-newtone-openapi.kakao.com/v1/synthesize"
rest_api_key = os.environ.get('API_KEY')
headers_recog = {
    "Content-Type": "application/octet-stream",
    "Authorization": "KakaoAK " + rest_api_key,
}
headers_synth = {
    "Content-Type": "application/xml",
    "Authorization": "KakaoAK " + rest_api_key,
}

# STT
with open('temp.wav', 'rb') as f:
    recog_in = f.read()
res_stt = requests.post(recognize_url, headers=headers_recog, data=recog_in)
if res_stt.raise_for_status():
    print('err', res.raise_for_status())

result_stt_json_str = res_stt.text[res_stt.text.index('{"type":"finalResult"'):res_stt.text.rindex('}')+1]
result_stt = json.loads(result_stt_json_str)

# TTS
tts_in = result_stt
synth_in = f"<speak> <voice name='WOMAN_DIALOG_BRIGHT'> {tts_in['value']} </voice> </speak>".encode('utf-8')

res_tts = requests.post(synthesize_url, headers=headers_synth, data=synth_in)
if res_tts.raise_for_status():
    print('err', res_tts.raise_for_status())

with open('temp.mp3', "wb") as f:
    f.write(res_tts.content)

stream = ffmpeg.input('temp.mp3')
stream = ffmpeg.output(stream, 'temp.webm')
ffmpeg.run(stream, overwrite_output=True)

