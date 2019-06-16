#!/bin/bash

# Create a bash profile file
echo "" > ~/.bash_profile

# Install Nodejs
eval "curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash"
eval ". ~/.nvm/nvm.sh"
eval "nvm install 8.10"

# Create the Documents directory
mkdir -p Documents/youtube-video-automator/

# Make sure that we have the github fingerprint into the knownhosts area
eval "mkdir -p ~/.ssh/"
eval "ssh-keyscan github.com >> ~/.ssh/known_hosts"

# Clone the github repository
git clone git@github.com:Javin-Ambridge/youtube-video-automator.git ~/Documents/youtube-video-automator/

# Install all the dependencies needed into the youtube video automator folder
eval "npm install ~/Documents/youtube-video-automator/"

# Copy the local attributes file into the config folder
eval "mv ~/local_attributes.js ~/Documents/youtube-video-automator/config/local_attributes.js"

# Add an empty 'secrets.js' file to the config folder just to prevent errors
eval "echo \"module.exports = {};\" > ~/Documents/youtube-video-automator/config/secrets.js"

# Done
echo "Done setting up encoding environment."
