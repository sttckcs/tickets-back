import dotenv
import requests
from bs4 import BeautifulSoup
import os
import logging

# Setup environment variables
dotenv_file = dotenv.find_dotenv()
dotenv.load_dotenv(dotenv_file)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration (mocked for security reasons)
login_url = "https://steamcommunity.com/openid/login"
refresh_url = "https://login.steampowered.com/jwt/refresh?redir=https%3A%2F%2Fsteamcommunity.com%2Fopenid%2Flogin%3Fopenid.mode%3Dcheckid_setup%26openid.ns%3Dhttp%253A%252F%252Fspecs.openid.net%252Fauth%252F2.0%26openid.realm%3Dhttps%253A%252F%252Fbuff.163.com%252F%26openid.sreg.required%3Dnickname%252Cemail%252Cfullname%26openid.assoc_handle%3DNone%26openid.return_to%3Dhttps%253A%252F%252Fbuff.163.com%252Faccount%252Flogin%252Fsteam%252Fverification%253Fback_url%253D%25252Faccount%25252Fsteam_bind%25252Ffinish%26openid.ns.sreg%3Dhttp%253A%252F%252Fopenid.net%252Fextensions%252Fsreg%252F1.1%26openid.identity%3Dhttp%253A%252F%252Fspecs.openid.net%252Fauth%252F2.0%252Fidentifier_select%26openid.claimed_id%3Dhttp%253A%252F%252Fspecs.openid.net%252Fauth%252F2.0%252Fidentifier_select%3Fopenid.mode%3Dcheckid_setup%26openid.ns%3Dhttp%253A%252F%252Fspecs.openid.net%252Fauth%252F2.0%26openid.realm%3Dhttps%253A%252F%252Fbuff.163.com%252F%26openid.sreg_required%3Dnickname%252Cemail%252Cfullname%26openid.assoc_handle%3DNone%26openid.return_to%3Dhttps%253A%252F%252Fbuff.163.com%252Faccount%252Flogin%252Fsteam%252Fverification%253Fback_url%253D%25252Faccount%25252Fsteam_bind%25252Ffinish%26openid.ns_sreg%3Dhttp%253A%252F%252Fopenid.net%252Fextensions%252Fsreg%252F1.1%26openid.identity%3Dhttp%253A%252F%252Fspecs.openid.net%252Fauth%252F2.0%252Fidentifier_select%26openid.claimed_id%3Dhttp%253A%252F%252Fspecs.openid.net%252Fauth%252F2.0%252Fidentifier_select"
steam_login_arguments = "?openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.realm=https%3A%2F%2Fbuff.163.com%2F&openid.sreg.required=nickname%2Cemail%2Cfullname&openid.assoc_handle=None&openid.return_to=https%3A%2F%2Fbuff.163.com%2Faccount%2Flogin%2Fsteam%2Fverification%3Fback_url%3D%252Faccount%252Fsteam_bind%252Ffinish&openid.ns.sreg=http%3A%2F%2Fopenid.net%2Fextensions%2Fsreg%2F1.1&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select?openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.realm=https%3A%2F%2Fbuff.163.com%2F&openid.sreg_required=nickname%2Cemail%2Cfullname&openid.assoc_handle=None&openid.return_to=https%3A%2F%2Fbuff.163.com%2Faccount%2Flogin%2Fsteam%2Fverification%3Fback_url%3D%252Faccount%252Fsteam_bind%252Ffinish&openid.ns_sreg=http%3A%2F%2Fopenid.net%2Fextensions%2Fsreg%2F1.1&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select"
steam_username = os.getenv('STEAM_USERNAME', 'your_steam_username')
testing = False
useProxy = False

proxies = {
    'http': 'http://127.0.0.1:8080',
    'https': 'http://127.0.0.1:8080',  # Note: Both HTTP and HTTPS traffic go through the http protocol here
}

# Initialize session
session = requests.Session()
if useProxy:
    session.proxies.update(proxies)
    session.verify = False  # Ignore SSL certificate verification
session.cookies.update({
    "browserid": "3297266264085632664",
    "sessionid": os.getenv('SESSIONID', 'your_sessionid'),
    "steamCountry": "ES%7Cbfbea265736097a0ba91bbafe728ba71",
    "steamLoginSecure": os.getenv('STEAMLOGINSECURE', 'your_steamloginsecure'),
    "timezoneOffset": "3600,0",
})

def main():
    try:
        response = session.get(login_url + steam_login_arguments)
        response.raise_for_status()  # Check for HTTP request errors

        if testing:
            with open("output.html", "w") as f:
                f.write(response.text)

        # Validate login
        if steam_username not in response.text:
            logging.error("Error: Invalid login session, trying to recover...")
            response = session.get(refresh_url, cookies={"steamRefresh_steam": os.getenv('STEAMLOGINSECURE', 'your_steamloginsecure'),"ak_bmsc": "902AE817DD601BC80DF365268F360128~000000000000000000000000000000~YAAQTHV7XK7GFi6OAQAAEAYKUhdDTKLOZ0aEgHUn2Fr3+SYrf83Vts8Cwogr8z/ePPpXh8HfCGBkX5BrZj14SzakwIUf0iSv1wxbXnrWurk/9IM4HpfyExO4xJvD46Jzi7ZfTz2WlkEu2UQnumMmVISnLcc0GhgDI+F/ez1YOg3+8p3Ld2b23oejNfHp5NRq9hk/4tBQOwQUFUnOm4Zq8trRVjhHWsKVMU0W8VizDYChan/kH+Ozv83LGQHhLexAF58wwxNCfArG9k2Me2O7eFYZNzM2MD09kDjlGQLfGueDGRchpxHOVkHWOWBqpkqVh4bxJtYURq+EIasGRcBOViigUP93PVzyFyWk8fdpKAWr0rr8g9HATzqwQ8oQ40owXZIi3A=="})
            dotenv.set_key(dotenv_file, 'STEAMLOGINSECURE', str(session.cookies.get_dict().get("steamLoginSecure")).strip())
            dotenv.set_key(dotenv_file, 'SESSIONID', str(session.cookies.get_dict().get("sessionid")).strip())
            dotenv.set_key(dotenv_file, 'awdawd', str(steam_username).strip())
            print("Authentication recovered")

        # Scrap data
        soup = BeautifulSoup(response.text, "html.parser")
        form = soup.find("form", {"id": "openidForm"})
        
        if testing:
            with open("output.html", "w") as f:
                f.write(response.text)

        if form is None:
            logging.error("Error: Form not found")
            return

        # Assuming the structure of inputs does not change. Add more checks for safety.
        inputs = {inp['name']: inp.get('value', '') for inp in form.find_all("input") if inp.has_attr('name')}
        response = session.post(login_url, data=inputs)
        response.raise_for_status()

        # Optionally, handle the response or further actions here
        print(response.cookies.get_dict().get("session") + "|" + response.cookies.get_dict().get("csrf_token"))

        if testing:
            with open("output.html", "w") as f:
                f.write(response.text)

    except requests.RequestException as e:
        logging.error(f"Error: Request failed: {e}")

if __name__ == "__main__":
    main()
