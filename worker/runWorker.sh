#!/bin/bash

if [ $# -ne 1 ]
then
	echo "Need to pass in a type of worker to run this."
	echo "Valid types are: 'downloader', 'encoder', 'fallback', 'uploader' and with a dash if its production and being run by PM2."
	exit 1
fi

if [ $1 = "downloader-prod" ]
then
	cmdStart="/home/ec2-user/Documents/youtube-video-automator/worker/"
	tmp="downloader"
elif [ $1 = "encoder-prod" ]
then
	cmdStart="/home/ec2-user/Documents/youtube-video-automator/worker/"
	tmp="encoder"
elif [ $1 = "fallback-prod" ]
then
	cmdStart="/home/ec2-user/Documents/youtube-video-automator/worker/"
	tmp="fallback"
elif [ $1 = "uploader-prod" ]
then
	cmdStart="/home/ec2-user/Documents/youtube-video-automator/worker/"
	tmp="uploader"
else
	tmp=$1
	cmdStart="./"
fi

if [ $tmp = "downloader" ]
then
	cmd1="worker_downloader.js"
	cmd="$cmdStart$cmd1"
elif [ $tmp = "encoder" ]
then
	cmd1="worker_encoder.js"
	cmd="$cmdStart$cmd1"
elif [ $tmp = "fallback" ]
then
	cmd1="worker_fallback.js"
	cmd="$cmdStart$cmd1"
elif [ $tmp = "uploader" ]
then
	cmd1="worker_uploader.js"
	cmd="$cmdStart$cmd1"
else
	echo "Passed an invalid argument."
	exit 1
fi

while ! $cmd
do
  sleep 1
  echo "Restarting program..."
done
