

# Youtube-Twitch-Automator

## Simple to use
The following automator was designed to be as simple to use and as robust as possible. To quickly summarize what this automator does: automatically polls for twitch clips, downloads these clips, combines these clips into a fully fledged video, and then automatically uploads the clips to Youtube setting specific titles, descriptions and tags.

This automator has a robust retry mechanism also, if there is ever a failure to post to Youtube, which sometimes happens if you get rate limited. It will automatically move the videos into a safe location, storing the information needed to post down the line. (The videos are also automatically uploaded the next time any of the normal or upload processes are run).

Simple  usage:

``` bash
# Starts the normal process of automation
npm start

# Attempts to upload the recovered content to Youtube
npm start recover

# Recovers the content. (This is used if there is ever an error with youtube upload and
# the content isn't automatically salvaged.
npm start recover-content
```

## Dependencies
### Some much needed heavy weight dependencies
There are a few very heavy weight dependencies that we need in order for this automation to work, all of these will be automatically downloaded to your system with the setup script so don't be alarmed. For reference two of the main dependencies we need are [FFMPEG](https://www.ffmpeg.org/) which handles our video processing, we need this to be downloaded to your global computer as the node application will run the process in a terminal thread. The main dependency we will need is [youtube-dl](https://rg3.github.io/youtube-dl/) which gives us the ability to download twitch clips with high quality, once again this will be automatically downloaded. Other than these two heavy weight components all we will need is our node dependencies. I have outlined all of the dependencies (and their uses) in a table below.

### Dependency List
Global Dependencies Needed:
| Dependency | Usage Description                                                                                                                             |
|------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| [FFMPEG](https://www.ffmpeg.org/)     | Used in the download process of twitch clips (youtube-dl uses this).  As well as plays the biggest role in combining clips into one main one. |
| [youtube-dl](https://rg3.github.io/youtube-dl/) | Used to download twitch clips at the highest quality.                                                                                         |

Node Dependencies Needed:
| Dependency           | Usage Description                                                              |
|----------------------|--------------------------------------------------------------------------------|
| base64url            | Used to store content in a safe way, as well as to handle OAuth callback data. |
| bluebird             | Main Promise library.                                                          |
| cli-progress         | Gives a nice looking progress bar for Youtube upload.                          |
| color-log            | Allows us to log in nice colours.                                              |
| get-video-dimensions | Returns the dimensions of the MP4 video.                                       |
| googleapis           | Allows us to authenticate with Youtube.                                        |
| knex                 | Connects to our database.                                                      |
| opn                  | Opens the webpage so we can perform an OAuth function with the user.           |
| pg                   | PostgreSQL database.                                                           |
| shelljs              | Allows the node script to interact with a shell thread.                        |
| twitch-api-v5        | Allows us to interact with Twitch.                                             |

## Setup and Configuration
### Installing Youtube-Twitch-Automator
``` bash
./setup.sh
```