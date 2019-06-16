FROM amazonlinux:latest

# The SSH private and public keys
ARG ssh_prv_key
ARG ssh_pub_key

# Download all the needed packages
RUN yum -y update
RUN yum -y install openssh-server openssh-clients
RUN yum -y install wget
RUN yum -y install tar.x86_64
RUN yum -y install git
RUN yum -y install postgresql postgresql-server postgresql-devel postgresql-contrib postgresql-docs
RUN yum clean all

# Start up the postgresql server
RUN service postgresql initdb

# Copy over the setup encoding environment script
ADD docker_info/setup_encoding_env.sh /home/ec2-user/setup_encoding_env.sh

# Copy over the local attributes production attributes file
ADD config/local_attributes.js /home/ec2-user/local_attributes.js

# Authorize SSH Host
RUN mkdir -p /home/ec2-user/.ssh && \
    chmod 0700 /home/ec2-user/.ssh && \
    ssh-keyscan github.com > /home/ec2-user/.ssh/known_hosts

# Add the keys and set permissions
RUN echo "$ssh_prv_key" > /home/ec2-user/.ssh/id_rsa && \
    echo "$ssh_pub_key" > /home/ec2-user/.ssh/id_rsa.pub && \
    chmod 600 /home/ec2-user/.ssh/id_rsa && \
    chmod 600 /home/ec2-user/.ssh/id_rsa.pub

# Run the setup encoding environment script
RUN /home/ec2-user/setup_encoding_env.sh
