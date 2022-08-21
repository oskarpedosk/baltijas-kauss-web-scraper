const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// Write starting bracket to .json file
require('fs').writeFile('test.json', ('['),
    function (err) {
        if (err) {
            console.error('Error writing .json file');
        }
    }
);

puppeteer.launch({ headless: true }).then(async browser => {
    console.log('Running tests..')
    const page = await browser.newPage()

    // Scrape all badges for badges database
    await page.goto('https://www.2kratings.com')
    const badgesArray = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#ui-list-badge li'))
            .map(link => link.textContent.trim());
    })

    // Create badges database array
    var badgesDatabase = []
    // Add other stats to stats struct
    for (let i = 0; i < badgesArray.length; i++) {
        var singleBadge = {}
        singleBadge.badge_id = i + 1
        singleBadge.name = badgesArray[i].replace('-', ' ')
        singleBadge.type = null
        singleBadge.info = null
        singleBadge.bronze_url = null
        singleBadge.silver_url = null
        singleBadge.gold_url = null
        singleBadge.hof_url = null
        badgesDatabase = badgesDatabase.concat(singleBadge)
    }

    var allPlayersBadges = []

    // Loop through team
    await page.goto('https://www.2kratings.com/teams/denver-nuggets')
    const player_urls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("div.ml-1:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr > td:nth-child(2) > div:nth-child(1) > a:nth-child(1)"))
            .map(link => link.href);
    })
    console.log(player_urls)

    for (let j = 0; j < 12; j++) {
        await page.goto(player_urls[j])

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

        // Scrape player badges to an array
        const badgesScrape = await page.evaluate(() =>
        (Array.from(document.querySelectorAll('#pills-all .badge-card'))
            .map(element =>
                [element.querySelector('h4').textContent.replace('-', ' ')]
                    .concat((element.querySelector('span').textContent),
                        (element.querySelector('p').textContent.replace('’', '\'')),
                        ("https://2kratings.com" + element.querySelector('img').getAttribute('data-src')
                        )))
        ))

        // Add player badges to allPlayersBadges array and update badges database with type,info and urls
        for (let k = 0; k < badgesScrape.length; k++) {
            // Initialize badge data order
            var singleBadge = {}
            singleBadge.player_id = j + 1
            singleBadge.first_name = infoArray[0][0]
            singleBadge.last_name = infoArray[0][1]
            singleBadge.badge_id = null
            singleBadge.name = null
            singleBadge.level = null
            if (badgesScrape[k][3].includes('bronze')) {
                singleBadge.level = 'bronze'
                for (let l = 0; l < badgesDatabase.length; l++) {
                    if (badgesScrape[k][0] === badgesDatabase[l].name) {
                        badgesDatabase[l].type = badgesScrape[k][1]
                        badgesDatabase[l].info = badgesScrape[k][2]
                        badgesDatabase[l].bronze_url = badgesScrape[k][3]
                        singleBadge.badge_id = badgesDatabase[l].badge_id
                        break
                    }
                }
            } else if (badgesScrape[k][3].includes('silver')) {
                singleBadge.level = 'silver'
                for (let l = 0; l < badgesDatabase.length; l++) {
                    if (badgesScrape[k][0] === badgesDatabase[l].name) {
                        badgesDatabase[l].type = badgesScrape[k][1]
                        badgesDatabase[l].info = badgesScrape[k][2]
                        badgesDatabase[l].silver_url = badgesScrape[k][3]
                        singleBadge.badge_id = badgesDatabase[l].badge_id
                        break
                    }
                }
            } else if (badgesScrape[k][3].includes('gold')) {
                singleBadge.level = 'gold'
                for (let l = 0; l < badgesDatabase.length; l++) {
                    if (badgesScrape[k][0] === badgesDatabase[l].name) {
                        badgesDatabase[l].type = badgesScrape[k][1]
                        badgesDatabase[l].info = badgesScrape[k][2]
                        badgesDatabase[l].gold_url = badgesScrape[k][3]
                        singleBadge.badge_id = badgesDatabase[l].badge_id
                        break
                    }
                }
            } else if (badgesScrape[k][3].includes('hof')) {
                singleBadge.level = 'hof'
                for (let l = 0; l < badgesDatabase.length; l++) {
                    if (badgesScrape[k][0] === badgesDatabase[l].name) {
                        badgesDatabase[l].type = badgesScrape[k][1]
                        badgesDatabase[l].info = badgesScrape[k][2]
                        badgesDatabase[l].hof_url = badgesScrape[k][3]
                        singleBadge.badge_id = badgesDatabase[l].badge_id
                        break
                    }
                }
            }
            singleBadge.name = badgesScrape[k][0]
            allPlayersBadges = allPlayersBadges.concat(singleBadge)
        }

        // Scrape info
        const NBAplayer = {
            player_id: j + 1,
            first_name: infoArray[0][0],
            last_name: infoArray[0][1],
            team: infoArray[0][2],
            positions: infoArray[0][3],
            archetype: infoArray[0][4],
            height: infoArray[0][5],
            weight: infoArray[0][6],
            img_url: infoArray[0][7],
            player_url: player_urls[j],
            stats: stats,
            badge_count: infoArray[0][8],
        }

        // Write to .json
        require('fs').appendFileSync('test.json', JSON.stringify(NBAplayer),
            function (err) {
                if (err) {
                    console.error('Error writing .json file');
                }
            }
        );
        if (j + 1 < 12) {
            require('fs').appendFileSync('test.json', (','),
                function (err) {
                    if (err) {
                        console.error('Error writing .json file');
                    }
                }
            );
        }
    }

    console.log(badgesDatabase)
    console.log(allPlayersBadges)

    // Write ending bracket to .json file
    require('fs').appendFileSync('test.json', (']'),
        function (err) {
            if (err) {
                console.error('Error writing .json file');
            }
        }
    );

    // Write to .json
    require('fs').writeFileSync('badges.json', JSON.stringify(badgesDatabase),
        function (err) {
            if (err) {
                console.error('Error writing .json file');
            }
        }
    );

    // Write to .json
    require('fs').writeFileSync('./scrape_data/players_badges.json', JSON.stringify(allPlayersBadges),
        function (err) {
            if (err) {
                console.error('Error writing .json file');
            }
        }
    );

    console.log(`All done!`)
    await browser.close()
})