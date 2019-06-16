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

# Create a bash profile file
echo "" > ~/.bash_profile

# Install Nodejs
eval "curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash"
eval ". ~/.nvm/nvm.sh"
eval "nvm install 8.10"

# Display the node version
eval "node -v"

# Create the Documents directory
mkdir -p Documents/youtube-video-automator/

# Make sure that we have the github fingerprint into the knownhosts area
eval "mkdir -p ~/.ssh/"
eval "ssh-keyscan github.com >> ~/.ssh/known_hosts"

# Clone the github repository
git clone git@github.com:Javin-Ambridge/youtube-video-automator.git ~/Documents/youtube-video-automator/

# Install all the dependencies needed into the youtube video automator folder
eval "npm install /root/Documents/youtube-video-automator/"

# Copy the local attributes file into the config folder
eval "mv /root/AddedContent/local_attributes.js /root/Documents/youtube-video-automator/config/local_attributes.js"

# Add an empty 'secrets.js' file to the config folder just to prevent errors
eval "echo \"module.exports = {};\" > /root/Documents/youtube-video-automator/config/secrets.js"

# Done
echo "Done setting up encoding environment. Starting to encode now."

# Run the Encoding Batch Job
eval "/root/Documents/youtube-video-automator/worker/runEncodingBatchJob.sh production $2 $3 $4"
