#!/usr/bin/python

import os
import sys
import re
import urllib
import time
import shutil
from os import path

debug=False
tmpDir="tmp-downloaded-files"
cdnPrefix="https://d2b3tzzd3kh620.cloudfront.net"

class LineWithLink(object):
	def __init__(self, lineNumber=None, lineStr=None, linkStr=None, fileType=None):
		self.LineNumber = lineNumber
		self.LineStr = lineStr
		self.LinkStr = linkStr
		self.FileType = fileType
		self.NewLink = None

	def setNewLink(self, newLink):
		self.NewLink = newLink

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

if len(sys.argv) < 2:
	print("No parameter passed.")
	exit()

fileName = sys.argv[1]
if not fileName.endswith(".html"):
	print("The file passed (" + fileName + ") isn't an HTML file.")
	exit()

if not path.exists(fileName):
	print("The file doesn't exist in the path provided.")
	exit()

print(bcolors.HEADER + "Starting to process the following file: " + fileName + bcolors.ENDC)

htmlFile = open(fileName, "r+")
lines = htmlFile.readlines()

linesWithLinks = []
for idx, val in enumerate(lines):
	found = re.search('(https:\/\/.+\.(png|jpg|jpeg|gif))', val, re.IGNORECASE)
	fileType = re.search('https:\/\/.+\.(png|jpg|jpeg|gif)', val, re.IGNORECASE)
	if found and fileType:
		linesWithLinks.append(LineWithLink(idx, val, found.group(1), fileType.group(1)))

print(bcolors.OKGREEN + "Found " + str(len(linesWithLinks)) + " lines with a link in them." + bcolors.ENDC)

if debug:
	for itm in linesWithLinks:
		print(bcolors.OKBLUE + "Found link on line " + str(itm.LineNumber) + bcolors.ENDC)

epochTime = str(time.time())

if os.path.exists(tmpDir):
	shutil.rmtree(tmpDir)

os.mkdir(tmpDir)
for itm in linesWithLinks:
	print(bcolors.HEADER + "Starting to process (" + itm.LinkStr + ")" + bcolors.ENDC)
	print(bcolors.HEADER + "---------------------------------------" + bcolors.ENDC)
	print(bcolors.OKGREEN + "Downloading." + bcolors.ENDC)
	fileActualName = str(itm.LineNumber) + "." + itm.FileType
	filePath = ("./" + tmpDir + "/" + fileActualName)
	urllib.urlretrieve(itm.LinkStr, filePath)
	print(bcolors.OKGREEN + "Uploading." + bcolors.ENDC)
	s3Path = "/email-content/" + epochTime + "/" + fileActualName
	cmd = "aws s3 cp " + filePath + " s3://autotuber-cdn-contents" + s3Path + " --acl public-read"

	if debug:
		print(bcolors.OKBLUE + cmd + bcolors.ENDC)

	output = os.popen(cmd).read()

	if debug:
		print(bcolors.OKBLUE + output + bcolors.ENDC)

	itm.setNewLink(cdnPrefix + s3Path)

	print(bcolors.OKGREEN + "Done (" + itm.NewLink + ")." + bcolors.ENDC)

print(bcolors.HEADER + "Starting to rebuild HTML file now." + bcolors.ENDC)

for itm in linesWithLinks:
	lines[itm.LineNumber] = lines[itm.LineNumber].replace(itm.LinkStr, itm.NewLink)

newFileName = "new_html_file" + epochTime + ".html"
newFile = open(newFileName, "w+")
for itm in lines:
	newFile.write(itm)

print(bcolors.HEADER + "Replacing old HTML file with new one." + bcolors.ENDC)

cmd = "mv " + newFileName + " " + fileName
output = os.popen(cmd).read()

if debug:
	print(bcolors.OKBLUE + cmd + bcolors.ENDC)

print(bcolors.HEADER + "Cleaning up." + bcolors.ENDC)

if os.path.exists(tmpDir):
	shutil.rmtree(tmpDir)

print(bcolors.HEADER + "Finished." + bcolors.ENDC)
