#!/bin/bash
source /Users/nsbuilduser/.bash_profile
$(which ns-server) --port 8700  2>&1 > /Users/nsbuilduser/logs/mobile-devices-controller-server.log