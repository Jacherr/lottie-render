#! /bin/sh

while :
do
	cd /home/james/lottie-render/dist
        node .
        if [ $? -eq 0 ]
        then
                break
        fi
        sleep 10 # wait 10 seconds before restarting
done