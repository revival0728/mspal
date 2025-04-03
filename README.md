# MSPal
A music-sharing tool. Enjoy music together with your friends!

😄-🎵-🎵-🎵-😄

## Feature
- Synchronizes operations such as play, pause, and skip next.
- Low internet requirement

## The Client
You can download the client from [Release](https://github.com/revival0728/mspal/releases)

### User Guide
After downloading and installation, open the app `mspal client`

![connect-ui](./assets/connect.png)

Enter the `URL` and `KEY` from the host.

The `TLS` means encrypted network communication. If your host server enabled the feature, then check it.


## The Host
You can download the host from [Release](https://github.com/revival0728/mspal/releases)

### Setup
Create a directory `media/` and add media files. Currently, it only supports `.mp3`

### Usage
The host server only has CLI.

```bash
play         # play the media
pause        # pause the media
next         # skip current media
status       # show media status
ping         # test ping to all clients
ping status  # shows the ping status of all clients
```

The `port` and `KEY` will be displayed after running the host.

### Configuration
The host can be configured using the `.env` file
```env
# port
PORT=3406

# TLS/SSL configuration
CERT="the certificate"
CERT_PATH="certificate path"

KEY="the private key"
KEY_PATH="private key path"
```