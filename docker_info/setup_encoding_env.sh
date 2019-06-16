#!/bin/bash

# Create a bash profile file
echo "" > ~/.bash_profile

# Install Nodejs
eval "curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash"
eval ". ~/.nvm/nvm.sh"
eval "nvm install 8.10"

# Install Git
eval "sudo yum install -y git"

# Install PostgreSQL
eval "sudo yum -y install postgresql postgresql-server postgresql-devel postgresql-contrib postgresql-docs"
eval "sudo service postgresql initdb"

# Create the Documents directory
mkdir Documents/

# Clone the github repository
git clone git@github.com:Javin-Ambridge/youtube-video-automator.git ~/Documents

# NPM Install the needed packages
eval "npm install ~/Documents/youtube-video-automator/"

# Done
echo "Done setting up encoding environment."
