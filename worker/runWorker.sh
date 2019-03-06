#!/bin/bash

if [ $# -ne 1 ]
then
	echo "Need to pass in a type of worker to run this."
	echo "Valid types are: 'downloader', 'encoder', 'fallback', 'uploader'"
	exit 1
fi

if [ $1 = "downloader" ]
then
	cmd="./worker_downloader.js"
elif [ $1 = "encoder" ]
then
	cmd="./worker_encoder.js"
elif [ $1 = "fallback" ]
then
	cmd="./worker_fallback.js"
elif [ $1 = "uploader" ]
then
	cmd="./worker_uploader.js"
else
	echo "Passed an invalid argument."
	exit 1
fi

while ! $cmd
do
  sleep 1
  echo "Restarting program..."
done
