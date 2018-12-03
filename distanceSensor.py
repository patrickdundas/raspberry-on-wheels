import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BOARD)

GPIO_TRIGGER = 38
GPIO_ECHO = 40

GPIO.setup(GPIO_TRIGGER, GPIO.OUT)
GPIO.setup(GPIO_ECHO, GPIO.IN)

def distance():
    #set TRIGGER to HIGH
    GPIO.output(GPIO_TRIGGER, True)
    time.sleep(0.00001)
    GPIO.output(GPIO_TRIGGER, False)

    StartTime = time.time()
    StopTime = time.time()

    while GPIO.input(GPIO_ECHO) == 0:
        StartTime = time.time()

    while GPIO.input(GPIO_ECHO) == 1:
        StopTime = time.time()

    TimeElapsed = StopTime - StartTime

    distance = (TimeElapsed * 34300) /2

    return distance

def main():
    dist = distance()
    print("{\"front-distance\": %.1f}" % dist)
    # try:
    #     while True:
    #         dist = distance()
    #         print("front-distance: %.1f" % dist)
    #         time.sleep(0.5)
    # except KeyboardInterrupt:
    #     print("Measurement stopped by user")
    #     GPIO.cleanup()
main()
