

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

# Hijacks a Twitch live stream. You start and stop downloading the live stream and saving it to a file.
npm start stream-hijack

# Oauth Init gets a refresh token from the user. This should be run before anything for personal use.
npm start oauth

# Oauth RM gets rid of the refresh token for the user in the DB. After this is run you will need to re-authenticate with 'npm start oauth'.
npm start rm-oauth

# Tests a feature that is currently in development
npm start test
```

## Dependencies
### Some much needed heavy weight dependencies
There are a few very heavy weight dependencies that we need in order for this automation to work, all of these will be automatically downloaded to your system with the setup script so don't be alarmed. For reference two of the main dependencies we need are [FFMPEG](https://www.ffmpeg.org/) which handles our video processing, we need this to be downloaded to your global computer as the node application will run the process in a terminal thread. The main dependency we will need is [youtube-dl](https://rg3.github.io/youtube-dl/) which gives us the ability to download twitch clips with high quality, once again this will be automatically downloaded. Other than these two heavy weight components all we will need is our node dependencies. I have outlined all of the dependencies (and their uses) in a table below.

### Dependency List
Global Dependencies Needed:


| Dependency                                                                                             | Usage Description                                                                                                                            |
|--------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| [FFMPEG](https://www.ffmpeg.org/)                                                                      | Used in the download process of twitch clips (youtube-dl uses this).,As well as plays the biggest role in combining clips into one main one. |
| [Streamlink](https://github.com/streamlink/streamlink) & [StreamLink 2](https://streamlink.github.io/) | Used to download twitch streams at the highest possible quality, while also removing the AD's from the HLS stream data.                      |

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
| get-video-duration   | Allows us to get the duration of videos on our local machine                   |

## Setup and Configuration
### Installing Youtube-Twitch-Automator

1) Download & Install [PostgreSQL](https://www.postgresql.org/download/).
2) Download & Install [FFMPEG](https://www.ffmpeg.org/download.html).
3) Download & Install [SteamLink](https://streamlink.github.io/install.html#macos).
4) Run `npm install`
5) Change the config/basic_config.js file to how you see fit (or leave it, as the defaults are fine).
6) Fill out the config/local_attributes_template.js file and save it as config/local_attributes.js.
7) Run 'npm start oauth' to authenticate for the first time.
8) Run `npm start`. The first time around you will need to authenticate with Youtube, this will be done by opening up a web browser on your computer.

## Future Plans + Notes
### Future Plans

1) Scale out to an [EC2 AWS Machine](https://aws.amazon.com/ec2/pricing/on-demand/) ([storage sizes](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html))
2) [Example](https://www.quora.com/Is-there-a-way-to-allow-someone-else-to-upload-videos-to-my-channel-without-giving-them-my-login-credentials) of how users will need to allow our account to post for them.

### OS Version
``` bash
# The following OS has been previously installed with, try to use this one or will have some issues.
Amazon Linux AMI 2018.03.0 (HVM), SSD Volume Type
```

### Testing connection to RDS Instance
``` bash
# Run the following command to see if you can connect to the DB instance from your current EC2 box.
psql --host=autotuberdb.c5jtpe3kuhkc.us-east-2.rds.amazonaws.com --port=5432 --username=javin --password --dbname=autotuberMain

# If you timeout, error, or anything accept actually get inside there is almost definitely an issue ahead.
# Possible solutions: Update the RDS Security Group Inbound Rules to accept requests from the new server private IP address. (Should be something like: 172.31.16.17)
```

### RabbitMQ Notes
``` bash
# List all the queues, with the number of messages
sudo rabbitmqctl list_queues

# For some reason the following command does not work: sudo rabbitmqctl purge_queue QUEUE_NAME
# Update the file and and add 'return ch.ack(msg);'
```

### Installing onto AWS EC2 Box
1) [Node, NPM, Git, PM2](https://hackernoon.com/deploying-a-node-app-on-amazon-ec2-d2fb9a6757eb)
2) [PostgreSQL](https://gist.github.com/dstroot/2920991)
3) [RabbitMQ](https://gist.github.com/ihor/5705626)
4) [NGINX](https://gist.github.com/nrollr/56e933e6040820aae84f82621be16670)
5) [ElastiCache - AKA Redis - Not currently in use.](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/nodes-connecting.html)
6) [S3 Access](http://codeomitted.com/transfer-files-from-ec2-to-s3/)
7) [Redis Local Server](https://medium.com/@andrewcbass/install-redis-v3-2-on-aws-ec2-instance-93259d40a3ce)
8) [HomeBrew](https://docs.brew.sh/Homebrew-on-Linux)
9) [StreamLink](https://streamlink.github.io/install.html#macos)
10) [Docker](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/docker-basics.html#install_docker)

### PM2 Cheatsheat
http://pm2.keymetrics.io/docs/usage/quick-start/

### Running on the AWS EC2 Box
1) Make sure you have the Rabbitmq server running (sudo service rabbitmq-server start)
2) Make sure you have the PostgreSQL server running (sudo service postgresql start)
3) Make sure you have the SSL certificates in the correct place. (Look at nginx_default.conf for location)
4) Make sure you have set the /etc/nginx/nginx.conf to be the nginx_default.conf file.
5) Make sure you have streamlink downloaded, and runnable.
6) Make sure you update the RDS inbound rules to accept connections from the new EC2 server.
7) Make sure you have the NGinx server running (sudo service nginx start)
8) Make sure you have the config/secrets.js , config/local_attributes.js , and the test_helper/helpers_tester.js files.
9) Make sure the above files are filled out correctly.
10) Make sure you make the migrations directory.
11) Test to see that you can run the server initially without issue (npm start open).
12) Start production services: pm2 start my-production-apps.json
13) Monitor which services are up: pm2 list

### Building a Docker Image
1) First Log in `$(aws ecr get-login --no-include-email --region us-east-2)`
2) Build the image `docker build -t encoding-batch-image --build-arg ssh_prv_key="$(cat /home/ec2-user/.ssh/id_rsa)" --build-arg ssh_pub_key="$(cat /home/ec2-user/.ssh/id_rsa.pub)" .`
3) Tag the image as latest `docker tag encoding-batch-image:latest 387701573213.dkr.ecr.us-east-2.amazonaws.com/encoding-batch-image:latest`
4) Push the image to the ECR repo `docker push 387701573213.dkr.ecr.us-east-2.amazonaws.com/encoding-batch-image:latest`

### Previous Problems and Solutions
1) Updating the Security group inbound rules, and deleting the TCP Port 80 - 0.0.0.0/0, ::/0 rule.
	- This rule is needed to allow outside connections, without this the server won't be able to be contacted.
2) The PORT for the local PostgreSQL server is already in use. 
	- Run `brew services stop postgresql`
