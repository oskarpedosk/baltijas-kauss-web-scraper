const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

var today = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0');
var yyyy = today.getFullYear();

today = mm + '-' + dd + '-' + yyyy;

puppeteer.launch({ headless: false }).then(async browser => {
    console.log('Running tests..')
    const page = await browser.newPage()
    // Loop through team
    await page.goto('https://www.2kratings.com/teams/charlotte-hornets')
    const player_urls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("div.ml-1:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr > td:nth-child(2) > div:nth-child(1) > a:nth-child(1)"))
            .map(link => link.href);
    })
    console.log(player_urls)

    for (let j = 0; j < 12; j++) {
        await page.goto(player_urls[j]);
        // Scrape player info to an array
        const infoArray = await page.evaluate(() =>
        (Array.from(document.querySelectorAll('.content > div:nth-child(1)'))
            .map(element =>
                // Main stats
                [(element.querySelector('h1').innerText.trim().match(/^(\S+)\s(.*)/).slice(1)[0]).replace('’', '\'')]
                    .concat(((element.querySelector('h1').innerText.trim().match(/^(\S+)\s(.*)/).slice(1)[1]).replace('’', '\'')),
                        (element.querySelector('.header-subtitle > p:nth-child(3) > a:nth-child(1)').textContent),
                        ([Array.from(document.querySelectorAll('.header-subtitle > p:nth-child(5) a')).map(element => element.textContent)]),
                        (element.querySelector('p.mb-0:nth-child(4) > span:nth-child(1)').textContent),
                        (parseInt(element.querySelector('p.mb-0:nth-child(6) > span:nth-child(1)').textContent.split(/[(c]+/)[1])),
                        (parseInt(element.querySelector('span.mb-0 > span:nth-child(1)')?.textContent.split(/[(k]+/)[1])),
                        (element.querySelector('.profile-photo .header-image').src),
                        ([Array.from(document.querySelectorAll('div.d-inline-block > span')).map(element => parseInt(element.textContent))]))
            )))

        // Scrape player overall rating
        const overall = await page.evaluate(() =>
            ["Overall", parseInt(document.querySelector('.attribute-box-player').textContent)]
        )

        // Scrape player stats
        const statsArray = await page.evaluate(() =>
        (Array.from(document.querySelectorAll('.mr-md-n4 h5'))
            .map(element =>
                // Main stats
                [element.textContent.trim().match(/^(\S+)\s(.*)/).slice(1)[1],
                (parseInt(element.textContent.trim().match(/^(\S+)\s(.*)/).slice(1)[0]))])
            .concat(
                (Array.from(document.querySelectorAll('.mr-md-n4 li')).map(element =>
                    // Header stats
                    [element.textContent.trim().match(/^(\S+)\s(.*)/).slice(1)[1],
                    (parseInt(element.textContent.trim().match(/^(\S+)\s(.*)/).slice(1)[0]))])),
                (Array.from(document.querySelectorAll('.card-horizontal h5')).map(element =>
                    // Intangibles
                    [element.textContent.trim().match(/^(\S+)\s(.*)/).slice(1)[1],
                    (parseInt(element.textContent.trim().replace(',', '').match(/^(\S+)\s(.*)/).slice(1)[0]))])))
        ))

        // Create stats struct with overall rating
        var stats = {
            [overall[0]]: overall[1],
        }
        // Add all other stats to stats struct
        for (let k = 0; k < statsArray.length; k++) {
            var key = statsArray[k][0]
            stats[key] = statsArray[k][1]
        }

        // Add secondary position null if player doesnt have a secondary position
        if (infoArray[0][3].length < 2) {
            infoArray[0][3] = infoArray[0][3].concat(null)
        }

        await page.goto('https://www.nba.com/players')
        await page.type('.Block_blockAd__1Q_77 > div:nth-child(1) > input:nth-child(1)', infoArray[0][0] + ' ' + infoArray[0][1][0] + infoArray[0][1][1] + infoArray[0][1][2])
        await page.waitForTimeout(500)
        const playerNBAurl = await page.evaluate(() => document.querySelector('.players-list > tbody:nth-child(2) > tr:nth-child(1) > td:nth-child(1) > a:nth-child(1)').href);
        console.log(playerNBAurl)
        await page.goto(playerNBAurl)

        const text = await page.evaluate(() => document.querySelector('img.PlayerImage_image__wH_YX:nth-child(2)').src);
        console.log(text)

        // Scrape info
        const NBAplayer = {
            first_name: infoArray[0][0],
            last_name: infoArray[0][1],
            primary_position: infoArray[0][3][0],
            secondary_position: infoArray[0][3][1],
            archetype: infoArray[0][4],
            nba_team: infoArray[0][2],
            height: infoArray[0][5],
            weight: infoArray[0][6],
            img_url: infoArray[0][7],
            player_url: player_urls[j],
            team_id: null,
            stats: stats,
            bronze_badges: infoArray[0][8][0],
            silver_badges: infoArray[0][8][1],
            gold_badges: infoArray[0][8][2],
            hof_badges: infoArray[0][8][3],
            total_badges: infoArray[0][8][4],
        }
    }

    // Write players .json
    require('fs').writeFileSync('./scrape_data/' + today + '-players.json', JSON.stringify(allNBAPlayers, null, "\t"),
        function (err) {
            if (err) {
                console.error('Error writing .json file');
            }
        }
    );

    console.log(`All done.`)
    await browser.close()
})