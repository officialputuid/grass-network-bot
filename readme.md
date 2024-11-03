# Grass Network Bot

## Description
Grass network bot is a simple tool designed to automate the interaction to Grass node server.

## Features
- **Automated node interaction**

## Prerequisites
- [Node.js](https://nodejs.org/) (version 12 or higher)

## Installation

1. Clone the repository to your local machine:
   ```bash
	git clone https://github.com/recitativonika/grass-network-bot.git
   ```
2. Navigate to the project directory:
	```bash
	cd grass-network-bot
	```
3. Install the necessary dependencies:
	```bash
	npm install
	```

## Usage

1. Set the `userid.txt` before running the script. Below how to setup this fie.
2. Modify the `userid.txt` file, put your userid in the text file, example below:
	```
	2oLV5yxxxxxxxxxxxxxxxxxx
	```
	To get your userid, follow this step:
	- Login to your grass account in https://app.getgrass.io/dashboard, make sure you is in this link before go to next step
	- Go to inspect element, press F12 or right-click then pick inspect element in your browser
	- Go to application tab - look for Local Storage in storage list -> click `https://app.getgrass.io` and you will see your UserId.
	or you can go Console tab and paste this 
	```bash
	localStorage.getItem('userId');`
 	```
3. Run the script:
	```bash
	node index.js
	```

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Note
This script only for testing purpose, using this script might violates ToS and may get your account permanently banned.

My reff code if you want to use :) : 
https://app.getgrass.io/register/?referralCode=qa1kV9MGyNffH3B
