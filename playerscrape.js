let page;
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

puppeteer.launch({ headless: true }).then(async browser => {
    console.log('Running scrape...')
    page = await browser.newPage()
    const player = await scrapePlayer('https://www.2kratings.com/cat-barber');
    // console.log(player)
    const player2 = await scrapePlayer('https://www.2kratings.com/dewayne-dedmon');
    // console.log(player)
    // const player3 = await scrapePlayer('https://www.2kratings.com/jarron-cumberland');
    // console.log(player)
    // const player4 = await scrapePlayer('https://www.2kratings.com/victor-wembanyama');
    // console.log(player)
    // var player = await scrapePlayer('https://www.2kratings.com/gabriele-procida');
    // console.log(player)

    console.log(`All done.`)
    await browser.close()
})

async function scrapePlayer(url) {
    await page.goto(url)

    const player = {
        first_name: null,
        last_name: null,
        primary_position: null,
        secondary_position: null,
        archetype: null,
        nba_team: null,
        nationality: null,
        height: null,
        weight: null,
        // img_url: await scrapePlayerImageURL("Lonzo", "Ball"),
        player_url: url,
        team_id: null,
        overall: null,
        attributes: null,
        bronze_badges: 0,
        silver_badges: 0,
        gold_badges: 0,
        hof_badges: 0,
        total_badges: 0,
    }

    // Name
    const name = await page.evaluate(() =>
        document.querySelector('.header-title').innerText);
    let regex = /(\S+)\s/;
    if (regex.test(name)) {
        player.first_name = getGroup(regex, name, 1)
        regex = /\S+\s(.+\S|)/;
        player.last_name = getGroup(regex, name, 1)
    }

    // Info (team, height, weight etc.)
    const player_info = await page.evaluate(() =>
            (Array.from(document.querySelectorAll('.header-subtitle > p'))
            .map(element => element.innerText)))

    for (let i = 0; i < player_info.length; i++) {
        const info = player_info[i];
        // Nationality
        let regex = /Nationality: (.+\w)/;
        if (regex.test(info)) {
            player.nationality = getGroup(regex, info, 1);
            continue;
        }
        // NBA team
        regex = /Team: (.+\w)/;
        if (regex.test(info)) {
            player.nba_team = getGroup(regex, info, 1);
            continue;
        }
        // Archetype
        regex = /Archetype: (.+\w)/;
        if (regex.test(info)) {
            player.archetype = getGroup(regex, info, 1);
            continue;
        }
        // Primary position
        regex = /Position: (\w+)/;
        if (regex.test(info)) {
            player.primary_position = getGroup(regex, info, 1);
            // Secondary position
            regex = /\/ (\w+)/;
            if (regex.test(info)) {
                player.secondary_position = getGroup(regex, info, 1);
            }
            continue;
        }
        // Height
        regex = /\((\d+)cm\)/;
        if (regex.test(info)) {
            player.height = parseInt(getGroup(regex, info, 1));
            regex = /\((\d+)kg\)/;
            if (regex.test(info)) {
                player.weight = parseInt(getGroup(regex, info, 1));
            }
            continue;
        }
    }

    // Scrape attributes
    const attributes_scrape = await page.evaluate(() => {
        const navAttributes = document.getElementById('nav-attributes');
        if (!navAttributes) {
          return [];
        }
        return [
          ...navAttributes.querySelectorAll('.card-header'),
          ...navAttributes.querySelectorAll('li')
        ].map(element => element.innerText);
      });
      
    

    // Add overall rating
    const overall_rating = await page.evaluate(() => {
        const element = document.querySelector('.attribute-box-player');
        return element ? parseInt(element.innerText) : null;
        });
        
    if (overall_rating) {
    player.overall = overall_rating;
    }

    // Add attributes
    let attributes = {}
    for (let i = 0; i < attributes_scrape.length; i++) {
        regex = /(\S+) (.+\w)/;
        const attribute_str = getGroup(regex, attributes_scrape[i], 2);
        let attribute_int = null;
        if (attribute_str === "Total Attributes") {
            regex = /\d+/g;
            attribute_int = parseInt(getGroup(regex, attributes_scrape[i], 0) + getGroup(regex, attributes_scrape[i], 1));
            if (attribute_int === 0) {
                attribute_int = null;
            }
        } else {
            attribute_int = parseInt(getGroup(regex, attributes_scrape[i], 1));
        }
        attributes[attribute_str] = attribute_int;
    }

    // Replace NaN attributes with null
    for (let key in attributes) {
        if (isNaN(attributes[key])) {
            attributes[key] = null;
        }
    }

    player.attributes = attributes;

    // Scrape player badges
    const badges = await scrapePlayerBadges();

    console.log(badges)
    for (let i = 0; i < badges.length; i++) {
        const level = getGroup(/_(\w+)./, badges[i].url, 1)
        if (level === "bronze") {
            player.bronze_badges++
        } else if (level === "silver") {
            player.silver_badges++
        } else if (level === "gold") {
            player.gold_badges++
        } else if (level === "hof") {
            player.hof_badges++
        }
        player.total_badges++
    }
    console.log(player)
    return player, badges
}

function getGroup(regex, str, index) {
    try {
        return str.match(regex)[index]
    } catch {
        return null
    }
}

async function scrapePlayerBadges() {
    const badges_scrape = await page.evaluate(() => {
        const badges = document.getElementById('pills-all');
        if (!badges) {
            return []
        } 
        return Array.from(badges.querySelectorAll('.card-body')).map(element => 
            Array.from(element.querySelectorAll('*')).map(el => el.innerText))
    });

    const badges_levels = await page.evaluate(() => {
        const badges = document.getElementById('pills-all');
        if (!badges) {
            return []
        } 
        return Array.from(badges.querySelectorAll('img')).map(element => element.getAttribute('data-src'))
    });

    const badges = []

    for (let i = 0; i < badges_scrape.length; i++) {
        const name = badges_scrape[i][0]
        const type = badges_scrape[i][1]
        const info = badges_scrape[i][2]
        const badge = {
            name: name,
            type: type,
            info: info,
            url: "https://2kratings.com" + badges_levels[i],
        }
        badges.push(badge)
    }
    return badges
}