# Audio, video and data channel server

This example illustrates establishing audio, video and a data channel with a
browser. It also performs some image processing on the video frames using
OpenCV.

The browser will send the audio and video from its webcam to the server.

The server will play a pre-recorded audio clip and send the received video back to the browser, optionally applying a transform to it.

In parallel to media streams, the browser sends a 'ping' message over the data channel, and the server replies with 'pong'.

## Installation

### Ubuntu 20.04

```bash
sudo apt install python3-pip -y
pip3 install --upgrade pip
sudo apt install python3-opencv -y
```

### VENV

```bash
sudo apt install python3.8-venv
```

Create a virtual environment

```bash
python3 -m venv venv
```

Activate

```bash
source ./venv/bin/activate
```

### Running

First install the required packages:

```bash
pip install -r requirements.txt
```

When you start the example, it will create an HTTP server which you
can connect to from your browser:

```bash
python3 server.py
```

You can then browse to the following page with your browser:
http://127.0.0.1:28443

## Additional options

If you want to enable verbose logging, run:

```bash
    python3 server.py -v
```

## Credits

The audio file "demo-instruct.wav" was borrowed from the Asterisk
project. It is licensed as Creative Commons Attribution-Share Alike 3.0:

https://wiki.asterisk.org/wiki/display/AST/Voice+Prompts+and+Music+on+Hold+License


## Docker

### Build Docker

```bash
    docker build -t nipa_demo/keti .
```

### Run Docker

```bash
    docker run --gpus all --rm -d -it -p 28443:28443 --name keti nipa_demo/keti
```