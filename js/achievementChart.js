var ctx = document.getElementById("achievementChart").getContext('2d');
// Placeholder in case data could not be loaded for whatever reason:
var transactionChart = new Chart(ctx, {
	options: {
		title: {
			display: true,
			text: 'Loading...'
		}
	}
});

function renderAchievements(months, achievementCountDataSets) {
	var ctx = document.getElementById("achievementChart").getContext('2d');
	var data = {
		labels: months,
		datasets: achievementCountDataSets
	};
	var options = {
		scales: {
			xAxes: [{
				stacked : true,
				type: 'time',
				time: {
					unit: 'month'
				},
				gridLines: {
					display: false
				},
     			offset: true
			}],
			yAxes: [{
				stacked : true,
				gridLines: {
					display: false
				},
				ticks: {
					beginAtZero: true
				}
			}]
		}
	};
	var achievementChart = new Chart(ctx, {
		type: 'bar',
		data: data,
		options: options
	});
}

function parseAchievements(rawAchievements) {
	// Extraction:
	var achievements = [];
	for (i = 0; i < rawAchievements.length; i++) {
		if (rawAchievements[i].achieved === 1) {
			achievements.push({
				"unixtime": rawAchievements[i].unlocktime,
				"name" : rawAchievements[i].apiname
			});
		}
	}

	var dates = [];
	var achievementCounts = [];
	if (achievements.length > 0) {
		// Sorting:
		function compareAchievements(a, b) {
			if (a.unixtime < b.unixtime) {
				return -1;
			}
			if (a.unixtime > b.unixtime) {
				return 1;
			}
			return 0;
		}
		achievements.sort(compareAchievements);

		// Grouping:
		var count = 0;
		dates = [new Date(achievements[0].unixtime*1000)];
		achievementCounts = [1];
		for (i = 1; i < achievements.length; i++) {
			var date = new Date(achievements[i].unixtime*1000);
			if (date.getYear() === dates[count].getYear() &&
				date.getMonth() === dates[count].getMonth() &&
				date.getDay() === dates[count].getDay()) {
				achievementCounts[count] += 1;
			} else {
				count += 1;
				dates[count] = date;
				achievementCounts[count] = 1;
			}
		}
	}

	return {
		dates: dates,
		achievementCounts: achievementCounts
	}
}

function parseGames(games) {
	var gameIds = [];
	var names = [];
	for (i = 0; i < games.length; i++) {
		gameIds[i] = games[i].appid;
		names[i] = games[i].name;
	}

	return {
		gameIds: gameIds,
		names: names
	};
}

var getJSON = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };
    xhr.send();
};

function processAchievementsForGame(appid) {
	return new Promise(function (fullfill, reject) {
		getJSON(
			'http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/'
			 + '?appid=' + appid
			 + '&key=' + 'BEDCC4DF8D6E903541324F215814C1D5'
			 + '&steamid=' + '76561198025410384',
			function(error, data) {
				if (error !== null) {
					fullfill('unsuccessful');
				} else {
					if ('playerstats' in data && 'achievements' in data.playerstats) {
						fullfill(parseAchievements(data.playerstats.achievements));
					} else {
						fullfill('unsuccessful');
					}
				}
			}
		);
	})
}

function findFirstYearAndMonth(gamesWithAchievements) {
	// Find the first year and month:
	var today = new Date();
	var firstYear = today.getFullYear();
	var firstMonth = today.getMonth();
	for (i = 0; i < gamesWithAchievements.length; i++) {
		var dates = gamesWithAchievements[i].dates;
		for (j = 0; j < dates.length; j++) {
			var date = dates[j];
			if (date.getFullYear() < firstYear) {
				firstYear = date.getFullYear();
				firstMonth = date.getMonth();
			} else if (date.getFullYear() === firstYear && date.getMonth() < firstMonth) {
				firstMonth = date.getMonth();
			}
		}
	}
	return {
		firstYear : firstYear,
		firstMonth : firstMonth
	}
}

function makeMonthsAndDataSets(gamesWithAchievements, firstYear, firstMonth) {
	let backgroundColors = [
		"#bf6060", "#4c2626", "#bf1a00", "#73281d", "#d9896c", "#ff6600", 
		"#ffd9bf", "#806c60", "#7f4400", "#e59900", "#736039", "#332900", 
		"#ffe680", "#8c8300", "#b8d936", "#bfd9a3", "#008c13", "#397341", 
		"#00f261", "#003314", "#36d9b8", "#00b3bf", "#4d6466", "#002933", 
		"#39ace6", "#1d4b73", "#397ee6", "#102340", "#000033", "#bfbfff", 
		"#7d7399", "#4b1d73", "#8800cc", "#d26cd9", "#ff00ee", "#330d30", 
		"#733960", "#ff40a6", "#660029", "#d9003a", "#ffbfd0"
    ]
    let borderColors = [
		"#000", 
    ]

	let today = new Date();
	let currentYear = today.getFullYear();
	let currentMonth = today.getMonth();
	let months = [];
	let year = firstYear;
	let month = firstMonth;
	while (year < currentYear) {
		while (month < 12) {
			months.push(new Date(year, month, 1));
			month++;
		}
		month = 0;
		year++;
	}
	while(month <= currentMonth) {
		months.push(new Date(year, month, 1));
		month++;
	}

	let achievementCountDataSets = [];
	for (i = 0; i < gamesWithAchievements.length; i++) {
		let dates = gamesWithAchievements[i].dates;
		let monthlyCounts = [];
		for (j = 0; j < months.length; j++) {
			monthlyCounts[j] = 0;
			for (k = 0; k < dates.length; k++) {
				if (dates[k].getFullYear() === months[j].getFullYear() && 
					dates[k].getMonth() === months[j].getMonth()) {
					monthlyCounts[j] += gamesWithAchievements[i].achievementCounts[k];
				}
			}
		}

		let dataset = {
			label : gamesWithAchievements[i].name,
			data : monthlyCounts,
			backgroundColor : backgroundColors[i % backgroundColors.length],
			borderColor : borderColors[i % borderColors.length],
			borderWidth : 1
		};
		achievementCountDataSets.push(dataset);
	}

	console.log(achievementCountDataSets);

	return {
		months : months, 
		achievementCountDataSets : achievementCountDataSets
	}
}

function processResponses(gameIds, names, responses) {
	var gamesWithAchievements = [];
	for (i = 0; i < responses.length; i++) {
		response = responses[i];
		if (response != 'unsuccessful') {
			if (response.dates.length > 0) {
				gamesWithAchievements.push(
					{
						'appid' : gameIds[i],
						'name' : names[i],
						'dates' : response.dates,
						'achievementCounts' : response.achievementCounts
					}
				);
			}
		}
	}
	let { firstYear, firstMonth } = findFirstYearAndMonth(gamesWithAchievements);
	let { months, achievementCountDataSets } = makeMonthsAndDataSets(gamesWithAchievements, firstYear, firstMonth);
	renderAchievements(months, achievementCountDataSets);
}

function getAndProcessGamesWithAchievements() {
	getJSON(
		'http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=BEDCC4DF8D6E903541324F215814C1D5&steamid=76561198025410384&format=json&include_appinfo=1',
		function(error, data) {
			if (error !== null) {
				alert('Steam API get request unsuccessful: ' + error);
			} else {
				let { gameIds, names } = parseGames(data.response.games);

				// Combine the results for the games for which there are achievements:
				const promises = [];
				for (i = 0; i < gameIds.length; i++) {
					promises.push(processAchievementsForGame(gameIds[i]));
				}

				let gamesWithAchievements = [];
				Promise.all(promises).then(responses => { // (*)
					processResponses(gameIds, names, responses);
				});
			}
		}
	);
}

getAndProcessGamesWithAchievements();