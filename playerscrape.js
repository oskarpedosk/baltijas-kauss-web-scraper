let page;
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

puppeteer.launch({ headless: true }).then(async browser => {
    console.log('Running scrape...')
    page = await browser.newPage()
    const player = await scrapePlayer('https://www.2kratings.com/charles-barkley-all-time-phoenix-suns');
    // console.log(player)
    const player2 = await scrapePlayer('https://www.2kratings.com/shai-gilgeous-alexander');
    // console.log(player)
    // const player3 = await scrapePlayer('https://www.2kratings.com/jarron-cumberland');
    // console.log(player)
    const player4 = await scrapePlayer('https://www.2kratings.com/victor-wembanyama');
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
        attributes: null,
        bronze_badges: null,
        silver_badges: null,
        gold_badges: null,
        hof_badges: null,
        total_badges: null,
    }

    // Name
    const name = await page.evaluate(() =>
        document.querySelector('.header-title').innerText);
    let regex = /(\S+)\s/;
    if (regex.test(name)) {
        player.first_name = getMatch(regex, name)
        regex = /\S+\s(.+\S|)/;
        player.last_name = getMatch(regex, name)
    }

    // Overall rating
    const overall = await page.evaluate(() =>
        ["Overall", parseInt(document.querySelector('.attribute-box-player').innerText)])

    // Info (team, height, weight etc.)
    const player_info = await page.evaluate(() =>
            (Array.from(document.querySelectorAll('.header-subtitle > p'))
            .map(element => element.innerText)))

    for (let i = 0; i < player_info.length; i++) {
        const info = player_info[i];
        // Nationality
        let regex = /Nationality: (.+\w)/;
        if (regex.test(info)) {
            player.nationality = getMatch(regex, info)
        }
        // NBA team
        regex = /Team: (.+\w)/;
        if (regex.test(info)) {
            player.nba_team = getMatch(regex, info)
        }
        // Archetype
        regex = /Archetype: (.+\w)/;
        if (regex.test(info)) {
            player.archetype = getMatch(regex, info)
        }
        // Primary position
        regex = /Position: (.+\w) \//;
        if (regex.test(info)) {
            player.primary_position = getMatch(regex, info)
            // Secondary position
            regex = /\/ (.+\w)/;
            if (regex.test(info)) {
                player.secondary_position = getMatch(regex, info)
            }

        }
        // Height
        regex = /\((\d+)cm\)/;
        if (regex.test(info)) {
            player.height = parseInt(getMatch(regex, info))
            regex = /\((\d+)kg\)/;
            if (regex.test(info)) {
                player.weight = parseInt(getMatch(regex, info))
            }
        }
    }

    const attributes_headers = await page.evaluate(() =>
            (Array.from(document.querySelectorAll('#nav-attributes'))
            .map(element => element.innerText)))
    console.log(attributes_headers)

    // Badge count
    // const badge_count = await page.evaluate(() =>
    //         (Array.from(document.querySelectorAll('.badges-container > div'))
    //         .map(element => element.innerText)))
    
    // if (badge_count.length !== 0) {
    //     player.bronze_badges = parseInt(badge_count[0]);
    //     player.silver_badges = parseInt(badge_count[1]);
    // }
    
    console.log(player)
        
    return player
}

function getMatch(regex, str) {
    try {
        return str.match(regex)[1]
    } catch {
        return null
    }
}