## Installation (Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_current.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Running

```bash
npm i
npm start
```

## Address

- https://gnlabs.iptime.org:20443/


## Docker

### Build Docker

```bash
    docker build -t nipa_demo/voice_chat .
```

### Run Docker

```bash
    docker run --gpus all --rm -d -it -p 20443:20443 --name voice_chat nipa_demo/voice_chat
```

