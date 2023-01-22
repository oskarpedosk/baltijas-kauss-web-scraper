let page;
const { performance } = require('perf_hooks');
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

puppeteer.launch({ headless: true }).then(async browser => {
    console.log('Running scrape...')
    let startTime = performance.now()
    page = await browser.newPage()
    const teams = await scrapeTeams('https://2kratings.com/current-teams'); // Scrape all 30 NBA teams urls
    teams.push("https://www.2kratings.com/teams/free-agency") // Add free agents to teams

    let player_id = 1;
    let players = [];

    // Loop through team
    for (let i = 30; i < teams.length; i++) {
        const team_players = await scrapeTeamPlayers(teams[i]); // Scrape all team players

        for (let j = 0; j < team_players.length; j++) {
            if (j === 8) {
                break; // Dont want to scrape too many free agents
            }
            const player = await scrapePlayer(team_players[j])
            player.id = player_id
            player_id++
            players.push(player)
            console.log(player.first_name, player.last_name, "scraped")
        }
        console.log(teams[i], "scraped")
        console.log("-----------------")
    }

    writeJSON(players, 'players');
    // writeJSON(badgesDatabase, 'badges');
    // writeJSON(allPlayersBadges, 'players-badges');

    console.log(`All done.`);
    let endTime = performance.now();
    let seconds = (endTime - startTime) / 1000.0;
    console.log(`Scrape took ` + seconds + ` seconds`);
    await browser.close();
})

async function scrapePlayer(url) {
    await page.goto(url) 

    const player = {
        id: null,
        first_name: null,
        last_name: null,
        primary_position: null,
        secondary_position: null,
        assigned_position: null,
        archetype: null,
        height: null,
        weight: null,
        nba_team: null,
        nationality: null,
        birthdate: null,
        jersey: "#",
        draft: null,
        img_url: null,
        ratings_url: url,
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
    const name_element = await page.evaluate(() =>
        document.querySelector('.header-title'));
    if (name_element) {
        const name = name_element.innerText;
        let regex = /(\S+)\s/;
        if (regex.test(name)) {
            player.first_name = getGroup(regex, name, 1)
            regex = /\S+\s(.+\S|)/;
            player.last_name = getGroup(regex, name, 1)
        }
    }

    // Info (team, height, weight etc.)
    const player_info = await page.evaluate(() =>
            (Array.from(document.querySelectorAll('.header-subtitle > p'))
            .map(element => element.innerText)));

    for (let i = 0; i < player_info.length; i++) {
        let info = player_info[i];
        // Nationality
        // let regex = /Nationality: (.+\w)/;
        // if (regex.test(info)) {
        //     player.nationality = getGroup(regex, info, 1);
        //     continue;
        
        // NBA team
        let regex = /Team: (.+\w)/;
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
        // Jersey
        regex = /Jersey: (#\d+)$/;
        if (regex.test(info)) {
            player.jersey = getGroup(regex, info, 1);
            continue;
        }
    }

    // Add overall rating
    const overall_rating = await page.evaluate(() => {
        const overall_rating_element = document.querySelector('.attribute-box-player');
        return overall_rating_element ? parseInt(overall_rating_element.innerText) : null;
        });
        
    if (overall_rating) {
    player.overall = overall_rating;
    }

    // Scrape attributes
    const attributes_scrape = await page.evaluate(() => {
        const attributes_element = document.getElementById('nav-attributes');
        if (!attributes_element) {
          return [];
        }
        return [
          ...attributes_element.querySelectorAll('.card-header'),
          ...attributes_element.querySelectorAll('li')
        ].map(element => element.innerText);
      });
      
    // Add attributes
    const attributes = addAttributes(attributes_scrape)
    player.attributes = attributes;

    // Scrape player badges
    const badges = await scrapePlayerBadges();

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

    // Scrape nba.com info and image
    const nba_com_scrape = await scrapePlayerImageURL(player.first_name, player.last_name);

    return player
}

function addAttributes(attributes_scrape) {
    let attributes = {
        OutsideScoring: null,
        Athleticism: null,
        InsideScoring: null,
        Playmaking: null,
        Defending: null,
        Rebounding: null,
        Intangibles: null,
        Potential: null,
        TotalAttributes: null,
        CloseShot: null,
        MidRangeShot: null,
        ThreePointShot: null,
        FreeThrow: null,
        ShotIQ: null,
        OffensiveConsistency: null,
        Speed: null,
        Acceleration: null,
        Strength: null,
        Vertical: null,
        Stamina: null,
        Hustle: null,
        OverallDurability: null,
        Layup: null,
        StandingDunk: null,
        DrivingDunk: null,
        PostHook: null,
        PostFade: null,
        PostControl: null,
        DrawFoul: null,
        Hands: null,
        PassAccuracy: null,
        BallHandle: null,
        SpeedwithBall: null,
        PassIQ: null,
        PassVision: null,
        InteriorDefense: null,
        PerimeterDefense: null,
        Steal: null,
        Block: null,
        LateralQuickness: null,
        HelpDefenseIQ: null,
        PassPerception: null,
        DefensiveConsistency: null,
        OffensiveRebound: null,
        DefensiveRebound: null,
    }
    
    for (let i = 0; i < attributes_scrape.length; i++) {
        regex = /(\S+) (.+\w)/;
        let attribute_str = getGroup(regex, attributes_scrape[i], 2);
        attribute_str = attribute_str.replaceAll(' ', '');
        attribute_str = attribute_str.replaceAll('-', '');
        let attribute_int = null;
        if (attribute_str === "TotalAttributes") {
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
    return attributes
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

async function scrapePlayerImageURL(first_name, last_name) {
    const nba_com_scrape = {};
    try {
        // Search for player with DuckDuckGo
        const query = first_name + ' ' + last_name + ' ' + 'nba.com';
        await page.goto('https://www.duckduckgo.com/');
        await page.waitForSelector('#searchbox_input');
        const search = await page.$('#searchbox_input');
        await search.type(query);
        await page.keyboard.press('Enter');

        await page.waitForSelector('#r1-0 > div:nth-child(2) > h2:nth-child(1) > a:nth-child(1)');
        const player_url = await page.evaluate(() => document.querySelector('#r1-0 > div:nth-child(2) > h2:nth-child(1) > a:nth-child(1)').href);

        // Go to nba.com
        await page.goto(player_url);

        const nba_dot_com_info = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('div.PlayerSummary_hw__HNuGb > div > div')).map(parent => 
                Array.from(parent.querySelectorAll('p')).map(element => element.innerText)
            );
        });

        const nba_dot_com_jersey_element = await page.evaluate(() => 
            document.querySelector('p.PlayerSummary_mainInnerInfo__jv3LO'));

        if (nba_dot_com_jersey_element) {
            const nba_dot_com_jersey = nba_dot_com_jersey_element.innerText;
            let regex = /(#\d+)/;
            if (regex.test(nba_dot_com_jersey)) {
                nba_com_scrape.jersey = getGroup(regex, nba_dot_com_jersey, 1);
            }
        }

        if (await page.$('img.PlayerImage_image__wH_YX:nth-child(2)') !== null) {
            nba_com_scrape.img_url = await page.evaluate(() => document.querySelector('img.PlayerImage_image__wH_YX:nth-child(2)').src);
        } else {
            nba_com_scrape.img_url = await page.evaluate(() => document.querySelector('img.PlayerImage_image__wH_YX').src);
        }

        for (let i = 0; i < nba_dot_com_info.length; i++) {
            if (nba_dot_com_info[i].length === 2) {
                const info = nba_dot_com_info[i][0]
                const data = nba_dot_com_info[i][1]
                if (info === "HEIGHT") {
                    regex = /\((\d\d\d)m\)/;
                    const height = data.replace('.', '');
                    if (regex.test(height)) {
                        nba_com_scrape.height = parseInt(getGroup(regex, height, 1));
                    }
                } else if (info === "WEIGHT") {
                    let regex = /\((\d+)kg\)/;
                    if (regex.test(data)) {
                        nba_com_scrape.weight = parseInt(getGroup(regex, data, 1));
                    }
                } else if (info === "COUNTRY") {
                    nba_com_scrape.nationality = data;
                } else if (info === "DRAFT") {
                    nba_com_scrape.draft = data;
                } else if (info === "BIRTHDATE") {
                    nba_com_scrape.birthdate = data;
                }

            }
        }
        console.log(nba_com_scrape)
        
        return nba_com_scrape
    } catch {
        console.log("Couldn't get player data from nba.com: " + first_name + " " + last_name);
        return nba_com_scrape
    }
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