let page;
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

puppeteer.launch({ headless: true }).then(async browser => {
    console.log('Running scrape...')
    page = await browser.newPage()
    const teams = await scrapeTeams('https://2kratings.com/current-teams'); // Scrape all 30 NBA teams urls
    console.log(teams)
    
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
    var players = []

    // Loop through team
    for (let i = 0; i < teams.length; i++) {
        const team_players = await scrapeTeamPlayers(teams[i]); // Scrape all 30 NBA teams urls
        console.log(team_players)

        for (let j = 0; j < 7; j++) {
            // https://www.2kratings.com/charles-barkley-all-time-phoenix-suns
            var player = await scrapePlayer('https://www.2kratings.com/charles-barkley-all-time-phoenix-suns');
            var player = await scrapePlayer(team_players[j]);
            console.log(player)

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
            // const overall = await page.evaluate(() =>
            //     ["Overall", parseInt(document.querySelector('.attribute-box-player').textContent)]
            // )

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
                singleBadge.player_id = i * 8 + j + 1
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

            // var playerNBAimg = await scrapePlayerImageURL(infoArray[0][0], infoArray[0][1])
            
            // Scrape info
            const NBAplayer = {
                player_id: i * 8 + j + 1,
                first_name: infoArray[0][0],
                last_name: infoArray[0][1],
                primary_position: infoArray[0][3][0],
                secondary_position: infoArray[0][3][1],
                archetype: infoArray[0][4],
                nba_team: infoArray[0][2],
                height: infoArray[0][5],
                weight: infoArray[0][6],
                img_url: await scrapePlayerImageURL(infoArray[0][0], infoArray[0][1]),
                player_url: team_players[j],
                team_id: null,
                stats: stats,
                bronze_badges: infoArray[0][8][0],
                silver_badges: infoArray[0][8][1],
                gold_badges: infoArray[0][8][2],
                hof_badges: infoArray[0][8][3],
                total_badges: infoArray[0][8][4],
            }

            players = players.concat(NBAplayer)
        }
    }

    writeJSON(allNBAPlayers, 'players');
    writeJSON(badgesDatabase, 'badges');
    writeJSON(allPlayersBadges, 'players-badges');

    console.log(`All done.`)
    await browser.close()
})

async function scrapePlayer(url) {
    await page.goto(url)
    // Scrape player overall rating
    var overall = await page.evaluate(() =>
    ["Overall", parseInt(document.querySelector('.attribute-box-player').textContent)]
    )
    var player_info = await page.evaluate(() =>
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
    var player = {
        first_name: "Jack",
        last_name: "Bauer",
        primary_position: "PG",
        secondary_position: "SG",
        archetype: "Mädaputs",
        nba_team: "LAL",
        height: 185,
        weight: 85,
        img_url: await scrapePlayerImageURL("Lonzo", "Ball"),
        player_url: url,
        team_id: null,
        stats: "stats",
        bronze_badges: 10,
        silver_badges: 12,
        gold_badges: 4,
        hof_badges: 1,
        total_badges: 27,
    }
    console.log(overall)
        
    return player
}

async function scrapePlayerImageURL(first_name, last_name) {
    var query = first_name + ' ' + last_name + ' ' + 'nba.com';
    try {
        await page.goto('https://www.duckduckgo.com/');
        const search = await page.$("#search_form_input_homepage");
        await search.type(query);
        await page.click('#search_button_homepage');

        await page.waitForSelector('#r1-0 > div:nth-child(2) > h2:nth-child(1) > a:nth-child(1)');
        var player_url = await page.evaluate(() => document.querySelector('#r1-0 > div:nth-child(2) > h2:nth-child(1) > a:nth-child(1)').href);

        await page.goto(player_url);
        await page.waitForSelector('img.PlayerImage_image__wH_YX:nth-child(2)');
        var player_image_url = await page.evaluate(() => document.querySelector('img.PlayerImage_image__wH_YX:nth-child(2)').src);
        console.log(player_image_url);
    } catch {
        console.log("Couldn't get player image: " + first_name + " " + last_name);
        var player_image_url = ""
    }
    return player_image_url
}

async function scrapeTeamPlayers(url) {
    await page.goto(url)
        var team_players = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("div.ml-1:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr > td:nth-child(2) > div:nth-child(1) > a:nth-child(1)"))
                .map(link => link.href);
        })
    return team_players
}

async function scrapeTeams(url) {
    await page.goto(url)
    var team_urls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".fixed-columns > div:nth-child(2) > table:nth-child(2) > tbody:nth-child(2) > tr > td:nth-child(1) > a:nth-child(1)"))
            .map(link => link.href);
    })
    return team_urls
}

function writeJSON(data, name) {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();

    date = dd + '-' + mm + '-' + yyyy;

    require('fs').writeFileSync('./scrape_data/' + date + '-' + name + '.json', JSON.stringify(data, null, "\t"),
        function (err) {
            if (err) {
                console.error('Error writing .json file');
            }
        }
    );
}