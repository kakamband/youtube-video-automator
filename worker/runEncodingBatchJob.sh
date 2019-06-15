#!/bin/bash

if [ $# -ne 4 ]
then
	echo "Need to pass in the environment type, the userID, all the clip ID's as a JSON string, and the download ID."
	echo "Valid environment types are: 'production', 'development'."
	echo "Valid user ID can be found by looking up the user."
	echo "Valid Clip ID's is a JSON array"
	echo "Valid Download ID is a string of an integer"
	exit 1
fi

if [ $1 = "production" ]
then
	cmdStart="/home/ec2-user/Documents/youtube-video-automator/worker/worker_encoder_task.js";
elif [ $1 = "development" ]
then
	cmdStart="/Users/javinambridge/Documents/youtube-creator-bot/youtube-video-automator/worker/worker_encoder_task.js";
fi

cmd="$cmdStart $2 $3 $4";
eval $cmd;
