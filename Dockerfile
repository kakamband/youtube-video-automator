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
RUN yum -y install tree
RUN yum clean all

# Copy over the local attributes production attributes file
ADD config/local_attributes.js ~/local_attributes.js

# Copy over the setup encoding environment script
ADD docker_info/setup_encoding_env.sh ~/setup_encoding_env.sh

# Authorize SSH Host
RUN mkdir -p ~/.ssh && \
    chmod 0700 ~/.ssh && \
    ssh-keyscan github.com > ~/.ssh/known_hosts

# Add the keys and set permissions
RUN echo "$ssh_prv_key" > ~/.ssh/id_rsa && \
    echo "$ssh_pub_key" > ~/.ssh/id_rsa.pub && \
    chmod 600 ~/.ssh/id_rsa && \
    chmod 600 ~/.ssh/id_rsa.pub

ENTRYPOINT ["~/setup_encoding_env.sh"]
