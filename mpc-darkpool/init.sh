#!/bin/bash
for ((PARTY=0;  PARTY < $1; PARTY++))
do
  echo "Initializing party $PARTY"
  python3 src/init.py --party $PARTY --nr_of_parties $1 &
  echo "Done"
done
wait
echo "The protocol has finished"
echo "Press any key to quit"
while [ true ] ; do
  read -t 3 -n 1
if [ $? = 0 ] ; then
  exit ;
else
  echo "waiting for the keypress"
fi
done