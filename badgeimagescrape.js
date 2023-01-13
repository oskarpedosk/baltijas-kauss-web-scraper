const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const fs = require('fs');


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

        for (let j = 0; j < 8; j++) {
            await page.goto(player_urls[j])

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
                if (badgesScrape[k][3].includes('bronze')) {
                    singleBadge.level = 'Bronze'
                    for (let l = 0; l < badgesDatabase.length; l++) {
                        if (badgesScrape[k][0] === badgesDatabase[l].name) {
                            if (badgesDatabase[l].bronze_url === null) {
                                badgesDatabase[l].type = badgesScrape[k][1]
                                badgesDatabase[l].info = badgesScrape[k][2]
                                badgesDatabase[l].bronze_url = badgesScrape[k][3]
                                singleBadge.badge_id = badgesDatabase[l].badge_id
    
                                page.on('response', async (response) => {
                                    const matches = /.*\.(png)$/.exec(response.url());
                                    if (matches && (matches.length === 2)) {
                                        const extension = matches[1];
                                        const buffer = await response.buffer();
                                        const filePath = 'images/';
                                        const fileName = badgesDatabase[l].name + '_Bronze';
                                        try {
                                            fs.writeFileSync(filePath + fileName + `.${extension}`, buffer, {flag: 'wx'}, 'base64');
                                        } catch {
                                        }
                                    }
                                });
                                await page.goto(badgesDatabase[l].bronze_url)
                                await page.waitForTimeout(1000)
                                break
                            }
                        }
                    }
                } else if (badgesScrape[k][3].includes('silver')) {
                    singleBadge.level = 'Silver'
                    for (let l = 0; l < badgesDatabase.length; l++) {
                        if (badgesScrape[k][0] === badgesDatabase[l].name) {
                            if (badgesDatabase[l].silver_url === null) {
                                badgesDatabase[l].type = badgesScrape[k][1]
                                badgesDatabase[l].info = badgesScrape[k][2]
                                badgesDatabase[l].silver_url = badgesScrape[k][3]
                                singleBadge.badge_id = badgesDatabase[l].badge_id
    
                                page.on('response', async (response) => {
                                    const matches = /.*\.(png)$/.exec(response.url());
                                    if (matches && (matches.length === 2)) {
                                        const extension = matches[1];
                                        const buffer = await response.buffer();
                                        const filePath = 'images/';
                                        const fileName = badgesDatabase[l].name + '_Silver';
                                        try {
                                            fs.writeFileSync(filePath + fileName + `.${extension}`, buffer, {flag: 'wx'}, 'base64');
                                        } catch {
                                        }
                                    }
                                });
                                await page.goto(badgesDatabase[l].silver_url)
                                await page.waitForTimeout(1000)
                                break
                            } 
                        }
                    }
                } else if (badgesScrape[k][3].includes('gold')) {
                    singleBadge.level = 'Gold'
                    for (let l = 0; l < badgesDatabase.length; l++) {
                        if (badgesScrape[k][0] === badgesDatabase[l].name) {
                            if (badgesDatabase[l].gold_url === null) {
                                badgesDatabase[l].type = badgesScrape[k][1]
                                badgesDatabase[l].info = badgesScrape[k][2]
                                badgesDatabase[l].gold_url = badgesScrape[k][3]
                                singleBadge.badge_id = badgesDatabase[l].badge_id
    
                                page.on('response', async (response) => {
                                    const matches = /.*\.(png)$/.exec(response.url());
                                    if (matches && (matches.length === 2)) {
                                        const extension = matches[1];
                                        const buffer = await response.buffer();
                                        const filePath = 'images/';
                                        const fileName = badgesDatabase[l].name + '_Gold';
                                        try {
                                            fs.writeFileSync(filePath + fileName + `.${extension}`, buffer, {flag: 'wx'}, 'base64');
                                        } catch {
                                        }
                                    }
                                });
                                await page.goto(badgesDatabase[l].gold_url)
                                await page.waitForTimeout(1000)
                                break
                            }
                        }
                    }
                } else if (badgesScrape[k][3].includes('hof')) {
                    singleBadge.level = 'HOF'
                    for (let l = 0; l < badgesDatabase.length; l++) {
                        if (badgesScrape[k][0] === badgesDatabase[l].name) {
                            if (badgesDatabase[l].hof_url === null) {
                                badgesDatabase[l].type = badgesScrape[k][1]
                                badgesDatabase[l].info = badgesScrape[k][2]
                                badgesDatabase[l].hof_url = badgesScrape[k][3]
                                singleBadge.badge_id = badgesDatabase[l].badge_id
    
                                page.on('response', async (response) => {
                                    const matches = /.*\.(png)$/.exec(response.url());
                                    if (matches && (matches.length === 2)) {
                                        const extension = matches[1];
                                        const buffer = await response.buffer();
                                        const filePath = 'images/';
                                        const fileName = badgesDatabase[l].name + '_HOF';
                                        try {
                                            fs.writeFileSync(filePath + fileName + `.${extension}`, buffer, {flag: 'wx'}, 'base64');
                                        } catch {
                                        }
                                    }
                                    });
                                await page.goto(badgesDatabase[l].hof_url)
                                await page.waitForTimeout(1000)
                                break
                            }
                        }
                    }
                }
                singleBadge.name = badgesScrape[k][0]
            }
            console.log("------ Player scraped ------")
        }
    }

    console.log(`All done.`)
    await browser.close()
})