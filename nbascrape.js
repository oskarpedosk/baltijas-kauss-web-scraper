const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

var today = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0');
var yyyy = today.getFullYear();

today = mm + '-' + dd + '-' + yyyy;

puppeteer.launch({ headless: true }).then(async browser => {
    console.log('Running tests..')
    const page = await browser.newPage()
    await page.goto('https://2kratings.com/current-teams')

    // Scrape all badges for badges database
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
        if (badgesArray[i] === 'Post Lockdown') {
            singleBadge.name = 'Post Move Lockdown'
        } else {
            singleBadge.name = badgesArray[i].replace('-', ' ')
        }
        singleBadge.type = null
        singleBadge.info = null
        singleBadge.bronze_url = null
        singleBadge.silver_url = null
        singleBadge.gold_url = null
        singleBadge.hof_url = null
        badgesDatabase = badgesDatabase.concat(singleBadge)
    }

    // Create edge case 'Guard Up'
    var singleBadge = {}
        singleBadge.name = 'Guard Up'
        singleBadge.badge_id = badgesArray.length + 1
        singleBadge.type = null
        singleBadge.info = null
        singleBadge.bronze_url = null
        singleBadge.silver_url = null
        singleBadge.gold_url = null
        singleBadge.hof_url = null
        badgesDatabase = badgesDatabase.concat(singleBadge)

    var allPlayersBadges = []
    var allNBAPlayers = []

    const team_urls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".fixed-columns > div:nth-child(2) > table:nth-child(2) > tbody:nth-child(2) > tr > td:nth-child(1) > a:nth-child(1)"))
            .map(link => link.href);
    })
    console.log(team_urls)

    // Loop through team
    for (let i = 0; i < team_urls.length; i++) {
        await page.goto(team_urls[i])
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
                singleBadge.player_id = i * 12 + j + 1
                singleBadge.first_name = infoArray[0][0]
                singleBadge.last_name = infoArray[0][1]
                singleBadge.badge_id = null
                singleBadge.name = null
                singleBadge.level = null
                if (badgesScrape[k][3].includes('bronze')) {
                    singleBadge.level = 'Bronze'
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
                    singleBadge.level = 'Silver'
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
                    singleBadge.level = 'Gold'
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
                    singleBadge.level = 'HOF'
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

            // Add secondary position null if player doesnt have a secondary position
            if (infoArray[0][3].length < 2) {
                infoArray[0][3] = infoArray[0][3].concat(null)
            }
            
            // Scrape info
            const NBAplayer = {
                player_id: i * 12 + j + 1,
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

            allNBAPlayers = allNBAPlayers.concat(NBAplayer)
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

    // Write bagdes .json
    require('fs').writeFileSync('./scrape_data/' + today +'-badges.json', JSON.stringify(badgesDatabase, null, "\t"),
        function (err) {
            if (err) {
                console.error('Error writing .json file');
            }
        }
    );

    // Write players badges table .json
    require('fs').writeFileSync('./scrape_data/' + today + '-players-badges-table.json', JSON.stringify(allPlayersBadges, null, "\t"),
        function (err) {
            if (err) {
                console.error('Error writing .json file');
            }
        }
    );

    console.log(`All done.`)
    await browser.close()
})