require("babel-core/register");
require("babel-polyfill");
import isMobile from "./utils/is-mobile";

/* global d3 */
let NUM_GAMES, START_YEAR, END_YEAR, INTERVAL, GAME_TICK_INTERVAL, DEFAULT_TEAM, PADDING, BEST_WINS, MEDIOCRE_WINS, WORST_WINS, FONT_SIZE, IS_DEFAULT_CLICK
const BG_DARK_GRAY = "#5F5F5F"
const BG_GRAY = "#828282"
const BG_LIGHT_GRAY = "#d8d8d8"
const BG_VERY_LIGHT_GRAY = "#ececec"
const PATH_ID = '#paths-wrapper'
const NBA = 'NBA'
const WNBA = 'WNBA'
const LEAGUE = NBA
const DEFAULT_FILTER_NAME = '--- All Teams ---'

function resize() {
	setConfig(LEAGUE)
	drawRecordigami(LEAGUE)
}

function init() {
	setConfig(LEAGUE)
	drawRecordigami(LEAGUE)
}

const teamAccessor = d => d.team
const teamParentAccessor = d => d.parent
const dateAccessor = d => new Date(d.date * 1000) //convert to milliseconds
const yearAccessor = d => d.year
const colorAccessor = d => d.primary_color
const secondaryColorAccessor = d => d.secondary_color
const winAccessor = d => d.win
const lossAccessor = d => d.loss
const countAccessor = d => d.count


async function setConfig(league) {
	IS_DEFAULT_CLICK = false
	if (league == WNBA) {
		START_YEAR = 1997
		END_YEAR = 2020
		NUM_GAMES = 34
		INTERVAL = 3
		GAME_TICK_INTERVAL = 5
		DEFAULT_TEAM = ""
		PADDING = 1.5
		BEST_WINS = 29
		MEDIOCRE_WINS = 17
		WORST_WINS = 4
		FONT_SIZE = 15
	} else if (league == NBA) {
		START_YEAR = 1946
		END_YEAR = 2021
		NUM_GAMES = 82
		INTERVAL = 10
		GAME_TICK_INTERVAL = 10
		DEFAULT_TEAM = ""
		PADDING = 1
		BEST_WINS = 73
		MEDIOCRE_WINS = 41
		WORST_WINS = 9
		FONT_SIZE = 15
		if (isMobile.any()) {
			PADDING = 1
			FONT_SIZE = 10
		}
	}
}

function drawBaseTiles(league, wrapperId=".wrapper-container", extra='', shouldTranslate=true) {
	// 2. Define Dimensions
	d3.select(`.${extra}svg`).remove()
	d3.select(`.${extra}bounds`).remove()
	// d3.select('.bounds-background').remove()

	const wrapperWidth = d3.select(wrapperId).node().offsetWidth
	const wrapperHeight = d3.select(wrapperId).node().offsetHeight
	let width = d3.min([
		1 * wrapperWidth,
		1 * wrapperHeight
	])
	let dimensions = {
		width: width,
		height: width,
		margin: {
			top: 60,
			right: 60,
			bottom: 80,
			left: 90,
		},
		legendWidth: width * 0.8,
		legendHeight: 20,
	}
	if (extra !== '') {
		dimensions.margin.top = 60
		dimensions.margin.left = 90
		dimensions.margin.right = 60
	}
	dimensions['legendWidth'] = (dimensions.width - dimensions.margin.left - dimensions.margin.right) * 1
	// on mobile
	if (isMobile.any()) {
		if (extra === "") {
			dimensions['legendWidth'] = width * .85
			dimensions['height'] = 1.5 * width
			dimensions['margin'] = {
					top: 50,
					right: 0,
					bottom: .5*width,
					left: 60,
			}
		} else {
			dimensions['legendWidth'] = width * 1
			dimensions['height'] = 1.5 * width
			dimensions['margin'] = {
					top: 50,
					right: 0,
					bottom: .5*width,
					left: 30,
			}
		}
		
	}
	dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
	dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom


	// 3. Draw Canvas
	var wrapper
	const pathsWrapperWidth = d3.select(`#${extra}paths-wrapper`).node().offsetWidth
	wrapper = d3.select(`#${extra}paths-wrapper`)
		.append("svg")
			.style("transform", `translate(${(pathsWrapperWidth - dimensions.width) / 2}px, ${0}px)`)
			.attr("width", dimensions.width)
			.attr("height", dimensions.height)
			.attr("class", `${extra}svg`)


	const bounds = wrapper.append("g")
		.style("transform", `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)
		.attr("class", `${extra}bounds`)

	const boundsBackground = bounds.append("rect")
		.attr("class", "bounds-background")
		.attr("x", 0)
		.attr("width", dimensions.boundedWidth)
		.attr("y", 0)
		.attr("height", dimensions.boundedHeight)

	// 4. Create Scales
	const tileSize = dimensions.boundedWidth / NUM_GAMES - PADDING
	const xScale = d3.scaleLinear()
		.domain([0, NUM_GAMES])
		.range([0, dimensions.boundedWidth - tileSize])

	const yScale = d3.scaleLinear()
		.domain([0, NUM_GAMES])
		.range([dimensions.boundedHeight - tileSize, 0])

	const yearIntervals = getIntervalArray(START_YEAR, END_YEAR, INTERVAL)

	// 5. Draw Data
	const defaultTileData = getEmptyWinLossData()
	const tilesGroup = bounds.append("g")
	const tiles = tilesGroup.selectAll(".rect-tile")
		.data(defaultTileData, d => d[0])
		.join("rect")
			.attr("class", "rect-tile")
			.attr("height", tileSize)
  			.attr("width", tileSize)
			.attr("x", (d) => xScale(lossAccessor(d)) + PADDING / 2)
			.attr("y", (d) => yScale(winAccessor(d)) + PADDING / 2)
			.attr("id", (d,i) => `${extra}tile-${winAccessor(d)}-${lossAccessor(d)}`)
			.attr("winPct", (d) => {
				const totalGames = lossAccessor(d) + winAccessor(d)
				if (totalGames > 0) {
					const winPct = 1.0 * winAccessor(d) / totalGames
					return winPct
				} else {
					return 0.5
				}
			})
			.style("fill", BG_VERY_LIGHT_GRAY)
			.style("opacity", 1)
			.attr("rx", 0)
			.attr("ry", 0)
	const winLossGroup = bounds.append("g")
	const winsText = winLossGroup.append("text")
		.text("Wins")
		.attr("x", -12)
		.attr("y", -10)
		.attr("font-size", FONT_SIZE)
		.attr("text-anchor", "middle")
		.attr("fill", BG_GRAY)
		.attr("id", `${extra}wins-text`)
		// .attr("opacity", 0.5)

	let lossesText = winLossGroup.append("text")
			.text("Losses")
			.attr("id", `${extra}losses-text`)
			.attr("x", dimensions.boundedWidth + 10)
			.attr("y", dimensions.boundedHeight + 17)
			.attr("font-size", FONT_SIZE)
			.attr("text-anchor", "start")
			.attr("alignment-baseline", "middle")
			.attr("fill", BG_GRAY)

	// on desktop
	if (isMobile.any()) {
		d3.select(`#${extra}losses-text`).remove()
		lossesText = winLossGroup.append("text")
			.text("Losses")
			.attr("x", dimensions.boundedWidth / 2)
			.attr("y", dimensions.boundedHeight + 35)
			.attr("font-size", FONT_SIZE)
			.attr("text-anchor", "middle")
			.attr("alignment-baseline", "middle")
			.attr("fill", BG_GRAY)
	}

	const winLossIntervals = getIntervalArray(GAME_TICK_INTERVAL, NUM_GAMES, GAME_TICK_INTERVAL)
	const winLabels = winLossGroup.selectAll(`.${extra}win-labels`)
		.data(winLossIntervals)
		.enter()
		.append("text")
			.text(d => d)
			.attr("class", `${extra}win-labels`)
			.attr("x", -15)
			.attr("y", win => yScale(win-0.5))
			.attr("font-size", FONT_SIZE)
			.attr("text-anchor", "middle")
			.attr("alignment-baseline", "middle")
			.attr("fill", BG_GRAY)

	const lossLabels = winLossGroup.selectAll(`.loss-labels`)
		.data(winLossIntervals)
		.enter()
		.append("text")
			.text(d => d)
			.attr("class", `${extra}loss-labels`)
			.attr("x", loss => xScale(loss + 0.5))
			.attr("y", dimensions.boundedHeight + 17)
			.attr("font-size", FONT_SIZE)
			.attr("text-anchor", "middle")
			.attr("alignment-baseline", "middle")
			.attr("fill", BG_GRAY)

	const zeroLabel = bounds.append("text")
		.text("0")
		.attr("x", -12)
		.attr("y", dimensions.boundedHeight + 17)
		.attr("font-size", FONT_SIZE)
		.attr("text-anchor", "start")
		.attr("alignment-baseline", "middle")
		.attr("fill", BG_GRAY)

	return [wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale]
}

function substringMatcher(strs) {
	return function findMatches(q, cb) {
		// an array that will be populated with substring matches
		const matches = [];
		// regex used to determine if a string contains the substring `q`
		const substrRegex = new RegExp(q, 'i');
		// iterate through the pool of strings and for any string that
		// contains the substring `q`, add it to the `matches` array
		$.each(strs, function(i, str) {
	      if (substrRegex.test(str)) {
	        matches.push(str);
	      }
	    });
		cb(matches);
	};
};

function highlightGroup(group, animationTime, color) {
	group
		.transition(`highlight-group`)
		.duration(animationTime)
		.style("fill", color)
		.style("stroke", color).style("stroke-opacity", 1)
}

function fadeGroup(group, animationTime, color) {
	group
		.transition(`fade-group`)
		.duration(animationTime)
		.style("fill", color)
		.style("stroke", color).style("stroke-opacity", 0)
}

function highlightClass(classId, animationTime, color) {
	const classIdString = `.${classId}`
	d3.selectAll(classIdString)
		.transition(`highlight-class-${classIdString}`)
		.duration(animationTime)
		.style("fill", color)
		.style("stroke", color).style("stroke-opacity", 1)
}

function fadeClass(classId, animationTime, color, strokeOpacity=0) {
	const classIdString = `.${classId}`
	d3.selectAll(classIdString)
		.transition(`fade-class-${classIdString}`)
		.duration(animationTime)
		.style("fill", color)
		.style("stroke", color).style("stroke-opacity", strokeOpacity)
}


function randomizeBetweenTwoNumbers(min, max){
	const randomNumber = (Math.floor(Math.random()*(max-min+1)+min))
	return randomNumber;
}

function drawVoronoiWithRetry(years, recordigamiData, xScale, yScale, dimensions, bounds, onMouseEnter, onMouseLeave, onMouseMove) {
	try {
		drawVoronoi(years, recordigamiData, xScale, yScale, dimensions, bounds, onMouseEnter, onMouseLeave, onMouseMove)
	} catch {
		// Voronoi points may be collinear in the X or Y-direction
		drawVoronoi(years, recordigamiData, xScale, yScale, dimensions, bounds, onMouseEnter, onMouseLeave, onMouseMove, true)
	}
}

function drawVoronoi(years, recordigamiData, xScale, yScale, dimensions, bounds, onMouseEnter, onMouseLeave, onMouseMove, shouldJitter=false) {
	bounds.selectAll(".voronoi").remove()
	const [voronoiPoints, voronoiMetadata] = getVoronoiPointsAndMetadata(years, recordigamiData, xScale, yScale, shouldJitter)
	const [voronoi, delaunay] = getVoronoi(voronoiPoints, dimensions)

	const voronoiDiagram = bounds.selectAll(".voronoi")
		.data(voronoiMetadata)
		.enter()
		.append("path")
			.attr("class", "voronoi")
			.attr("d", (d,i) => voronoi.renderCell(i))
			// .style("stroke", "salmon")
			.on("mousemove", onMouseMove)
			.on("mouseenter", onMouseEnter)
			.on("mouseleave", onMouseLeave)
}

function getVoronoi(points, dimensions) {
	const delaunay = d3.Delaunay.from(points)
	const voronoi = delaunay.voronoi()
	voronoi.xmax = dimensions.boundedWidth + dimensions.boundedWidth / NUM_GAMES
	voronoi.ymax = dimensions.boundedHeight + dimensions.boundedWidth / NUM_GAMES
	return [voronoi, delaunay]
}

function randomDecimalFromInterval(min, max, numDecimalPoints=5) { // min and max included 
  return parseFloat((Math.random() * (max - min) + min).toFixed(numDecimalPoints))
}

function getVoronoiPointsAndMetadata(seasons, recordigamiData, xScale, yScale, shouldJitter=false) {
	const gamesSeen = {}
	const points = []
	const pointsMetadata = []
	for (var i = 0; i < seasons.length; i++) {
		const year = seasons[i].toString()
		if (year in recordigamiData) {
			const recordigamiGames = recordigamiData[year]
			const recordigamiKeys = Object.keys(recordigamiGames)
			const gamesWins = recordigamiKeys.map(game => {return recordigamiGames[game].win})
			const gamesLosses = recordigamiKeys.map(game => {return recordigamiGames[game].loss})
			const gamesXValues = recordigamiKeys.map(game => {return xScale(recordigamiGames[game].loss)})
			const gamesYValues = recordigamiKeys.map(game => {return yScale(recordigamiGames[game].win)})
			const gamesTeams = recordigamiKeys.map(game => {return recordigamiGames[game].team})
			const gamesYear = recordigamiKeys.map(game => {return recordigamiGames[game].year})
			const gamesPrimaryColor = recordigamiKeys.map(game => {return recordigamiGames[game].primary_color})
			for (var j = 0; j < gamesXValues.length; j++) {
				const gameWin = gamesWins[j]
				const gameLoss = gamesLosses[j]
				const gameX = shouldJitter ? (gamesXValues[j] + randomDecimalFromInterval(.00000001, .00000002, 11)).toPrecision(11) : gamesXValues[j].toPrecision(11)
				const gameY = shouldJitter ? (gamesYValues[j] + randomDecimalFromInterval(.00000001, .00000002, 11)).toPrecision(11) : gamesYValues[j].toPrecision(11)
				const gameTeam = gamesTeams[j]
				const gameYear = gamesYear[j]
				const gamePrimaryColor = gamesPrimaryColor[j]
				const gameKey = `${gameWin}_${gameLoss}`
				if (!(gameKey in gamesSeen)) {
					gamesSeen[gameKey] = 1
					points.push([gameX, gameY])
					pointsMetadata.push({
						'x': gameX,
						'y': gameY,
						'team': gameTeam,
						'year': gameYear,
						'win': gameWin,
						'loss': gameLoss,
						'primary_color': gamePrimaryColor
					})
				} else {
					gamesSeen[gameKey] += 1
				}
			}
		}
	}
	return [points, pointsMetadata]
}

function getWinPctFromWinsAndLosses(wins, losses) {
	let winPct = (wins+losses) > 0 ? ((Math.round(1000.0 * wins/(wins+losses))) / 1000).toFixed(3).toString() : ''
	if (winPct.startsWith('0.')) {
		return '.' + winPct.split('0.')[1]
	}
	return winPct
}

function range(start, end) {
	const range = Array(end - start + 1).fill().map((_, idx) => start + idx)
  	return range
}

function makeColors(primaryColor, numDarker=4, numLighter=4, pctDarker=0.64, pctLighter=0.8) {
	primaryColor = d3.rgb(primaryColor)
	const primaryRed = primaryColor.r
	const primaryGreen = primaryColor.g
	const primaryBlue = primaryColor.b

	const darkScale = [primaryColor]
	const darkRedStep = primaryRed * pctDarker / numDarker
	const darkGreenStep = primaryGreen * pctDarker / numDarker
	const darkBlueStep = primaryBlue * pctDarker / numDarker
	for (var i = 0; i < numDarker; i++) {
		const darkerColor = d3.rgb(
			darkScale[i].r - darkRedStep,
			darkScale[i].g - darkGreenStep,
			darkScale[i].b - darkBlueStep,
		)
		darkScale.push(darkerColor)
	}

	const lightScale = [primaryColor]
	const lightRedStep = (255 - primaryRed) * pctLighter / numLighter
	const lightGreenStep = (255 - primaryGreen) * pctLighter / numLighter
	const lightBlueStep = (255 - primaryBlue) * pctLighter / numLighter
	for (var i = 0; i < numLighter; i++) {
		const lighterColor = d3.rgb(
			lightScale[i].r + lightRedStep,
			lightScale[i].g + lightGreenStep,
			lightScale[i].b + lightBlueStep,
		)
		lightScale.push(lighterColor)
	}

	// Remove 1st element to avoid double inclusion
	darkScale.shift()
	const colorScale = [lightScale.reverse(), darkScale].flat(1);
	return colorScale
}

function getIntervalArray(start, end, intervalLength) {
	const startInterval = Math.floor(start / intervalLength) * intervalLength
	const endInterval = Math.floor(end / intervalLength) * intervalLength
	const numIntervals = Math.ceil((endInterval - startInterval) / intervalLength)
	const intervals = [startInterval]
	for (var i = 0; i < numIntervals; i++) {
		const currentInterval = intervals[i] + intervalLength
		intervals.push(currentInterval)
	}
	return intervals
}

// Good for decades etc.
function getNonRoundedIntervalArray(start, end, intervalLength) {
	const startInterval = (start-start)
	const endInterval = (end-start)
	const numIntervals = Math.floor((endInterval - startInterval) / intervalLength)
	const intervals = [start]
	for (var i = 0; i < numIntervals; i++) {
		const currentInterval = intervals[i] - start + intervalLength
		intervals.push(currentInterval+start)
	}
	return intervals
}


function getEmptyWinLossData(n=NUM_GAMES) {
	const emptyWinLossData = []
	for (var i = 0; i <= n; i++) {
		for (var j = 0; j <= n; j++) {
			if (i + j <= n) {
				emptyWinLossData.push({win: i, loss: j})
			}
		}
	}
	return emptyWinLossData
}

async function drawRecordigami(league) {
	const [wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale] = drawBaseTiles(league, ".recordigami-container", "recordigami-", false)
	const recordigamiData = await d3.json(`./../assets/data/${league}_recordigami.json`)
	const seasonData = await d3.json(`/assets/data/${league}_season_paths.json`)
	const teamData = await d3.json(`/assets/data/${league}_teams.json`)
	const teams = Object.keys(teamData)


	$('.typeahead').on('typeahead:selected', function(obj, datum) {
		d3.select(".exit-icon").style('visibility', 'visible').style('pointer-events', 'all')
    });

	$('#basketball-team-input').typeahead({
		hint: true,
		highlight: true,
		minLength: 0
	},
	{
		name: 'teams',
		limit: 200,
		source: substringMatcher(teams)
	});


	const suggestionGroup = d3.selectAll(".suggestion")
	suggestionGroup.on("click", onSuggestionClick)
	// d3.select("#autocomplete").on("keydown", onAutocompleteKeydown)

	function onSuggestionClick(e, suggestionIndex) {
		const suggestionItem = d3.select(suggestionGroup.nodes()[suggestionIndex])
		const suggestion = suggestionItem.attr("value")
		const suggestionDecade = parseInt(suggestionItem.attr("decade"))
		d3.select("#basketball-autocomplete").attr("autocomplete", "on")
		$("#basketball-autocomplete").val(suggestion)
		DEFAULT_TEAM = suggestion
    	d3.selectAll("#graphic-wrapper > *").remove();
    	setConfig()
    	d3.select("#basketball-team-input").property('value', suggestion)
    	$('#basketball-team-input').typeahead('val', suggestion);

    	IS_DEFAULT_CLICK = true
  		drawRecordigamiByTeam(league, DEFAULT_TEAM, recordigamiData, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale, suggestionDecade)
  		// d3.select(".pac-container").style("height", 0)
	}

	if (DEFAULT_TEAM === "") {
		d3.select("#basketball-autocomplete")
			.style("visibility", "hidden")
		d3.select("#basketball-team-input")
			.style("color", BG_GRAY)
	}

    d3.select(".exit-icon").on("click", onExitClick)
    function onExitClick(e) {
		drawRecordigamiByTeam(league, DEFAULT_FILTER_NAME, recordigamiData, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
    	DEFAULT_TEAM = ""
		d3.select("#basketball-team-input").property('value', "")
		$('#basketball-team-input').typeahead('val', "");
		$("#basketball-autocomplete").val("")
		d3.select(".exit-icon").style('visibility', 'hidden').style('pointer-events', 'none')
    }

	drawRecordigamiByTeam(league, DEFAULT_TEAM, recordigamiData, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
	d3.select(".typeahead")
		.style("border", `1px solid ${BG_GRAY}`)
		.style("border-radius", '30px')

	$('#basketball-team-input').on('typeahead:selected', function (e, team) {
		drawRecordigamiByTeam(league, team, recordigamiData, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
		DEFAULT_TEAM = team
		d3.select("#basketball-team-input").property('value', DEFAULT_TEAM)
		$('#basketball-team-input').typeahead('val', DEFAULT_TEAM);
		$("#basketball-autocomplete").val(DEFAULT_TEAM)
	});
}


async function drawRecordigamiByTeam(league, filterTeam, recordigamiData, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale, suggestionDecade) {
	bounds.selectAll(".recordigami-tile").remove()
	// bounds.selectAll(".voronoi").remove()
	bounds.selectAll(".season-label").remove()
	bounds.selectAll(".legend-tile").remove()
	bounds.selectAll(".legend-value").remove()
	bounds.selectAll(".bookend-legend-tile").remove()
	bounds.selectAll(".championship-star").remove()
	bounds.selectAll(".record-label").remove()
	bounds.selectAll(".best-label").remove()
	bounds.selectAll(".overall-label").remove()
	bounds.selectAll(".worst-label").remove()
	d3.selectAll("*[class^=decade-]").remove()
	wrapper.selectAll(".team-logo").remove()
	wrapper.selectAll(".team-logo-label").remove()

	let teamRecordigamiData = {}

	if (filterTeam === "") {
		d3.select(".sticky").style("pointer-events", "none")
	} else if (filterTeam !== DEFAULT_FILTER_NAME) {
		const primaryColor = teamData[filterTeam]['primary_color']
		const secondaryColor = teamData[filterTeam]['secondary_color']
		d3.select("#basketball-team-input")
			.style("color", primaryColor)
		d3.select(".typeahead")
			.style("border", `1px solid ${secondaryColor}`)
			.style("border-radius", '30px')
	} else if (filterTeam === DEFAULT_FILTER_NAME) {
		d3.select("#basketball-team-input")
			.style("color", "black")
		d3.select(".typeahead")
			.style("border", `1px solid black`)
			.style("border-radius", '30px')
	}
	
	const recordigamiYears = Object.keys(recordigamiData)





	const basketballColors = makeColors("#B54213")
	const basketballColorScale = d3.scaleThreshold()
  		.domain(yearIntervals)
  		.range(basketballColors);
 	const basketballColorContinuousScale  = d3.scaleSequential(d3.interpolateSpectral)
 		.domain([
 			d3.max(yearIntervals),
 			START_YEAR - 1
		])

	const grayColors = makeColors(BG_LIGHT_GRAY)
	const grayContinuousScale  = d3.scaleLinear()
 		.domain(yearIntervals)
		.range(grayColors)
		.interpolate(d3.interpolateRgb);

	// 6. Draw Peripherals
	const intervals = getIntervalArray(START_YEAR, END_YEAR, INTERVAL)
	const decadeClasses = intervals.map(interval => `decade-${interval}`)
	const decadeHighlightColors = intervals.map(interval => basketballColorContinuousScale(interval))
	decadeHighlightColors[4] = makeColors(decadeHighlightColors[4], 4,4,0.2,0.8)[6]
	const intervalFadeColors = decadeHighlightColors.map(color => makeColors(color)[0])
	const legendFadeColors = decadeHighlightColors.map(color => makeColors(color)[1])
	const decadeFadeColors = decadeHighlightColors.map(color => BG_VERY_LIGHT_GRAY)
	let totalNumRecordigami = 0
	let teamNumRecordigami = 0

	const intervalGroups = []
	for (var i = 0; i < intervals.length; i++) {
		const intervalGroup = bounds.append("g")
		const interval = intervals[i]
		const intervalKeys = range(Math.floor(interval / INTERVAL) * INTERVAL, Math.floor(interval / INTERVAL) * INTERVAL + (INTERVAL - 1))
		const intervalData = []
		for (var k = 0; k < intervalKeys.length; k++) {
			if (intervalKeys[k] in recordigamiData) {
				const intervalNestedKeys = Object.keys(recordigamiData[intervalKeys[k]])
				for (var j = 0; j < intervalNestedKeys.length; j++) {

					
					const dataItem = recordigamiData[intervalKeys[k]][intervalNestedKeys[j]]
					if (dataItem.team === filterTeam) {
						teamNumRecordigami += 1
						if (intervalKeys[k] in teamRecordigamiData)
							teamRecordigamiData[intervalKeys[k]][intervalNestedKeys[j]] = dataItem
						else {
							teamRecordigamiData[intervalKeys[k]] = {}
							teamRecordigamiData[intervalKeys[k]][intervalNestedKeys[j]] = dataItem
						}
					} 

					intervalData.push(dataItem)
					totalNumRecordigami += 1
				}
			}
			
			
		}

		intervalData.flat(1)
		const intervalTiles = intervalGroup.selectAll(`.decade-${interval}`)
			.data(intervalData)
			.enter()
			.append("rect")
				.attr("class", (d) => `decade-${interval} recordigami-tile interval-tile-${winAccessor(d)}-${lossAccessor(d)}`)
				.attr("height", dimensions.boundedWidth / NUM_GAMES - PADDING)
	  			.attr("width", dimensions.boundedWidth / NUM_GAMES - PADDING)
				.attr("x", (d) => xScale(lossAccessor(d)) + PADDING / 2)
				.attr("y", (d) => yScale(winAccessor(d)) + PADDING / 2)
				// .style("stroke", BG_VERY_LIGHT_GRAY).style("stroke-opacity", 0)
				// .style("fill", BG_VERY_LIGHT_GRAY)
				.style("stroke", (d) => {
					if (filterTeam === DEFAULT_FILTER_NAME) {
						return decadeHighlightColors[i]
					} else if (filterTeam === "") {
						return BG_VERY_LIGHT_GRAY
					} else if (filterTeam === d.team) {
						return BG_DARK_GRAY
					} else {
						return legendFadeColors[i]
					}
				})
				.style("stroke-opacity", filterTeam === "" ? 0 : 1)
				.style("fill", (d) => {
					if (filterTeam === DEFAULT_FILTER_NAME) {
						return decadeHighlightColors[i]
					} else if (filterTeam === "") {
						return BG_VERY_LIGHT_GRAY
					} else if (filterTeam === d.team) {
						return decadeHighlightColors[i]
					} else {
						return legendFadeColors[i]
					}
				})
				.style("opacity", 1)
		intervalGroups.push(intervalTiles)
	}





	if (![DEFAULT_FILTER_NAME, ''].includes(filterTeam)) {

		let orderedTeamHistory = teamData[filterTeam]['history'] === 0 ? [filterTeam] : JSON.parse(teamData[filterTeam]['history'])
		const teamParent = teamData[filterTeam]['parent']
		if (![0, 'deprecated'].includes(teamParent)) {
			orderedTeamHistory =  JSON.parse(teamData[teamParent]['history'])
		}

		let logoShift = 20
		let logoSize = 55
		let logoY = -15
		let logoFontSize = 10
		let logoX = -dimensions.margin.left + logoShift / 2 - 10
		let logoX2 = logoX + logoSize / 2
		let logoPadding = 25
		if (isMobile.any()) {
			logoSize = 25
			logoShift = 25
			logoY = -15
			logoFontSize = 6
			logoX = dimensions.boundedWidth - logoShift / 2 - logoSize
			logoX2 = logoX + logoSize / 2
			logoPadding = 15
		}
		
		
		const logoFade = 0.4
		
		const logo = bounds.selectAll(".team-logo")
			.data(orderedTeamHistory)
			.enter()
			.append("svg:image")
				.attr("class", "team-logo logo")
				.attr("xlink:href", team => `/assets/images/logos/${league}/${team}.png`)
				.attr("width", logoSize)
				.attr("height", logoSize)
				.attr("x", logoX)
				.attr("y", (d,i) => logoY + (i) * (logoSize + logoPadding))
				.attr("opacity", d => {
					if (d === filterTeam) {
						return 1
					} else {
						return logoFade
					}

				})
				.style('filter', d => {
					if (d !== filterTeam) {
						return 'url(#grayscale)'
					}
					return
				})


		const logoLabel = bounds.selectAll(".team-logo-label")
			.data(orderedTeamHistory)
			.enter()
			.append("text")
				.text(d => {
					const logoSeasons = Object.keys(seasonData[d]['seasons'])
					const logoStartYear = logoSeasons[0]
					const logoEndYear = parseInt(logoSeasons[logoSeasons.length - 1]) === END_YEAR ? "Now" : logoSeasons[logoSeasons.length - 1]
					if (logoStartYear === logoEndYear) {
						return logoStartYear
					}
					return `${logoStartYear} - ${logoEndYear}`
				})
				.attr("class", "team-logo-label logo")
				.attr("x", logoX2)
				.attr("y", (d,i) =>  logoY + (i + 1) * (logoSize + logoPadding) - logoPadding * .6)
				.attr("text-anchor", "middle")
				.style("font-size", logoFontSize)	
				.attr("opacity", d => {
					if (d === filterTeam) {
						return 1
					} else {
						return logoFade
					}
				})
				.attr("fill", d => {
					if (d === filterTeam) {
						return "black" // teamData[d]['primary_color']
					} else {
						return "d8d8d8"
					}
				})
		logo.on("click", onLogoMouseClick)
		function onLogoMouseClick(clickedTeam) {
			if (clickedTeam !== filterTeam) {
				DEFAULT_TEAM = clickedTeam
				const basketballTeamInput = d3.select("#basketball-team-input")
				basketballTeamInput.property("value", clickedTeam);
	    		$('#basketball-team-input').typeahead('val', clickedTeam);
				drawRecordigamiByTeam(league, clickedTeam, recordigamiData, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
			}
		}

	}


	const legendGroup = bounds.append("g")
	
	let legendY = dimensions.boundedHeight + 35
	let legendX = 0
	let legendXPadding = 10
	let legendFontSize = 10
	if (isMobile.any()) {
		legendY = dimensions.boundedHeight + 60
		legendX = -dimensions.margin.left
		legendXPadding = 5
		legendFontSize = 10
	}

	const legendTileWidth = Math.min(
		(dimensions.legendWidth - (legendXPadding * intervals.length - 1)) / yearIntervals.length,
		(dimensions.legendWidth - (legendXPadding * intervals.length - 1)) / (intervals.length - 1)
	)


	const legendXRange = Array.from({length: intervals.length}, (_, n) => legendX + (n)*(legendTileWidth+legendXPadding))
	const legendXScale = d3.scaleLinear()
		.domain(d3.extent(intervals))
		.range(d3.extent(legendXRange))

	const legendTiles = legendGroup.selectAll(".legend-tile")
	  .data(intervals)
	  .enter()
	  .append("rect")
	    .attr("class", (d, i) => `decade-${d} legend-${i}`)
	    .attr("x", (d, i) => LEAGUE === WNBA && i === 0 ? legendXScale(d) + (legendTileWidth - legendTileWidth / INTERVAL) : (LEAGUE === NBA && i === 0 ? legendXScale(d) + (legendTileWidth - legendTileWidth * .4) : legendXScale(d)))
	    .attr("y", legendY)
	    .attr("width", (d,i) => LEAGUE === WNBA && i === 0 ? legendTileWidth / INTERVAL : (LEAGUE === NBA && i === 0 ? legendTileWidth * .4 : legendTileWidth))
	    .attr("height", dimensions.legendHeight)
	    // .style("fill", d => basketballColorContinuousScale(d))
	    .style("stroke", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? decadeHighlightColors[i] : BG_VERY_LIGHT_GRAY)
	    .style("fill", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? decadeHighlightColors[i] : BG_VERY_LIGHT_GRAY)

	// WNBA filler tile
	if (league === WNBA) {
		const wnbaFillerTile = legendGroup.append("rect")
			.attr("class", `filler-tile`)
		    .attr("x", legendXScale(1995))
		    .attr("y", legendY)
		    .attr("width", legendTileWidth - legendTileWidth / INTERVAL)
		    .attr("height", dimensions.legendHeight)
		    // .style("fill", d => basketballColorContinuousScale(d))
		    .style("stroke", BG_VERY_LIGHT_GRAY)
		    .style("fill", BG_VERY_LIGHT_GRAY)
	}

	// NBA filler tile
	if (league === NBA) {
		const nbaFillerTile = legendGroup.append("rect")
			.attr("class", `filler-tile`)
		    .attr("x", legendXScale(1940))
		    .attr("y", legendY)
		    .attr("width", legendTileWidth - legendTileWidth * .4)
		    .attr("height", dimensions.legendHeight)
		    // .style("fill", d => basketballColorContinuousScale(d))
		    .style("stroke", BG_VERY_LIGHT_GRAY)
		    .style("fill", BG_VERY_LIGHT_GRAY)
	}


	let legendLabels
	if (isMobile.any() && LEAGUE === NBA) {
		legendLabels = legendGroup.selectAll(".recordigami-legend-value")
		  .data(intervals)
		  .enter()
		  .append("text")
		  	.attr("class", (d, i) => `decade-${d} legend-${i}`)
		    .attr("x", d => legendXScale(d) + legendTileWidth / 2)
		    .attr("y", legendY + dimensions.legendHeight + 10)
		    .style("fill", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? decadeHighlightColors[i] : BG_GRAY)
		    .style("stroke", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? decadeHighlightColors[i] : "none")
		    .style("stroke-opacity", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? 1 : 0)
		    .text((d,i) => `${d}s`)
		    .attr("text-anchor", "middle")
		    .style("alignment-baseline", "middle")
		    .style("font-size", legendFontSize)
		    .style("fill", "none")
	}  else if (isMobile.any() && LEAGUE === WNBA) {
		legendLabels = legendGroup.selectAll(".recordigami-legend-value")
		  .data(intervals)
		  .enter()
		  .append("text")
		  	.attr("class", (d, i) => `decade-${d} legend-${i}`)
		    .attr("x", d => legendXScale(d) + legendTileWidth / 2)
		    .attr("y", legendY + dimensions.legendHeight + 10)
		    .style("fill", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? decadeHighlightColors[i] : BG_GRAY)
		    .style("stroke", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? decadeHighlightColors[i] : "none")
		    .style("stroke-opacity", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? 1 : 0)
		    .text((d,i) => LEAGUE === WNBA && i===0 ? `${1997}` : `'${d.toString().substr(2,)}-'${(d+INTERVAL-1).toString().substr(2,)}`) // : `${d}s`)
		    .attr("text-anchor", "middle")
		    .style("alignment-baseline", "middle")
		    .style("font-size", isMobile.any() && LEAGUE === WNBA ? legendFontSize : legendFontSize)
		    .style("fill", "none")
	} else {
		legendLabels = legendGroup.selectAll(".recordigami-legend-value")
		  .data(intervals)
		  .enter()
		  .append("text")
		  	.attr("class", (d, i) => `decade-${d} legend-${i}`)
		    .attr("x", d => legendXScale(d) + legendTileWidth / 2)
		    .attr("y", legendY + dimensions.legendHeight + 10)
		    .style("fill", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? decadeHighlightColors[i] : BG_GRAY)
		    .style("stroke", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? decadeHighlightColors[i] : "none")
		    .style("stroke-opacity", (d, i) => DEFAULT_FILTER_NAME === filterTeam ? 1 : 0)
		    .text((d,i) => LEAGUE === WNBA && i===0 ? `${1997}` : (LEAGUE === NBA && i===0 ? '1946-49' : `${d}-${(d+INTERVAL-1).toString().substr(2,)}`)) // : `${d}s`)
		    .attr("text-anchor", "middle")
		    .style("alignment-baseline", "middle")
		    .style("font-size", isMobile.any() && LEAGUE === WNBA ? legendFontSize : legendFontSize)
		    .style("fill", "none")
	}


	// 7. Create Interactions
	const legendFade = 0.25
	let seasonFade = 0.05
	let seasonSemiFade = 0.25
	let filteredRecordigamiTiles = {'_groups': [[]]}
	let intervalStart, intervalEnd

	legendGroup.on("click", onLegendMouseClick)
	const isHighlighted = intervals.map(interval => true)

	// SEASON_HISTORY[]
	let hoverPct = .75
	let hoverFontSize = 24
	let hoverFontSizeSmall = 18
	let hoverGapY = 50
	let hoverStartY = -10
	let hoverY = 20
	if (isMobile.any()) {
		hoverPct = .65
		hoverFontSize = 15
		hoverFontSizeSmall = 12
		hoverGapY = 20
		hoverStartY = -10
		hoverY = 10
	}
	const hoverSquare = bounds.append("rect")
		.attr("class", "rect")
		.attr("id", "hover-square")
		.attr("height", dimensions.boundedWidth / NUM_GAMES - PADDING)
		.attr("width", dimensions.boundedWidth / NUM_GAMES - PADDING)
		.attr("fill", "transparent")
		.attr("x", 0)
		.attr("y", 0)
		.style("opacity", 0)
		.style("stroke", "white")
		.style("stroke-width", "1.5px")
	const hoverStartingPointX = dimensions.boundedWidth / 2 - dimensions.margin.left / 2 + dimensions.margin.right / 2
	const hoverWin = bounds.append("text")
		.text('0')
		.attr("class", "record-label")
		.attr("id", 'win-label')
		.attr("x", hoverStartingPointX - 14.5)
		.attr("y", hoverY)
		.attr("text-anchor", "end")
		.style("font-size", hoverFontSize)
		.style("fill", "black")
		.style("opacity", 0)
	const hoverHyphen = bounds.append("text")
		.text('-')
		.attr("class", "record-label")
		.attr("id", 'hyphen')
		.attr("x", hoverStartingPointX )
		.attr("y", hoverY)
		.attr("text-anchor", "middle")
		.style("font-size", hoverFontSize)
		.style("fill", "black")
		.style("opacity", 0)
	const hoverLoss = bounds.append("text")
		.text('0')
		.attr("class", "record-label")
		.attr("id", 'loss-label')
		.attr("x", hoverStartingPointX + 14.5)
		.attr("y", hoverY)
		.attr("text-anchor", "start")
		.style("font-size", hoverFontSize)
		.style("fill", 'black')
		.style("opacity", 0)
	const hoverTeam = bounds.append("text")
		.text('')
		.attr("class", "record-label")
		.attr("x", hoverStartingPointX)
		.attr("y", hoverStartY)
		.attr("text-anchor", "middle")
		.style("font-size", hoverFontSize)
		.style("fill", "black")
		.style("opacity", 0)
	const numRecordigamiDescription = bounds.append("text")
		.text('Total # Recordigami')
		.attr("id", "num-recordigami-description")
		.attr("class", "record-label")
		.attr("x", hoverStartingPointX)
		.attr("y", hoverStartY)
		.attr("text-anchor", "middle")
		.style("font-size", hoverFontSize)
		.style("fill", "black")
		.style("opacity", 0)

	const numRecordigamiDescriptionBBox = d3.select("#num-recordigami-description").node().getBBox()
	const numRecordigamiDescriptionBBoxWidth = numRecordigamiDescriptionBBox.width
	const numRecordigamiLabel = bounds.append("text")
		.text(totalNumRecordigami)
		.attr("id", "num-recordigami")
		.attr("class", "record-label")
		.attr("x", hoverStartingPointX) //numRecordigamiDescriptionBBox.x + numRecordigamiDescriptionBBox.width / 2)
		.attr("y", hoverY)
		.attr("text-anchor", "middle")
		.style("font-size", hoverFontSize)
		.style("fill", "black")
		.style("opacity", 0)

	if (![DEFAULT_FILTER_NAME, ''].includes(filterTeam)) {
		legendGroup.style("pointer-events", "none")
	} else {
		legendGroup.style("pointer-events", "all")
	}

	function onLegendMouseClick(e) {
		const [x] = d3.mouse(this)
		const clickedYear = legendXScale.invert(x)
		intervalStart = Math.floor(clickedYear / INTERVAL) * INTERVAL
		intervalEnd = intervalStart + (INTERVAL - 1)
		const intervalYears = range(intervalStart, intervalEnd)
		const intervalIndex = intervals.indexOf(intervalStart)
		const intervalClass = decadeClasses[intervalIndex]
		const intervalGroup = intervalGroups[intervalIndex]
		const intervalHighlightColor = decadeHighlightColors[intervalIndex]

		const isExactlyOneTileSelected = isHighlighted.filter(Boolean).length === 1
		const isHighlightedTileSelected = isHighlighted[intervalIndex]

		if (isExactlyOneTileSelected && isHighlightedTileSelected) {
			d3.select("#hover-square").style("stroke", "white")
			d3.select("#num-recordigami").text(`${totalNumRecordigami}`).style("opacity", 1)
			for (var i = intervals.length - 1; i >= 0; i--) {
				const isIntervalHighlighted = isHighlighted[i]
				if (!isIntervalHighlighted) {
					highlightGroup(intervalGroups[i], 0, decadeHighlightColors[i])
					highlightGroup(legendGroup.selectAll(`.decade-${intervals[i]}`), 0, decadeHighlightColors[i])
					isHighlighted[i] = true
				}
			}
			drawVoronoiWithRetry(recordigamiYears, recordigamiData, xScale, yScale, dimensions, bounds, onRecordigamiMouseEnter, onRecordigamiMouseLeave, onRecordigamiMouseMove)
		} else {
			const numRecordigami = intervalGroup._groups[0].length
			if (numRecordigami > 0) {
				drawVoronoiWithRetry(intervalYears, recordigamiData, xScale, yScale, dimensions, bounds, onRecordigamiMouseEnter, onRecordigamiMouseLeave, onRecordigamiMouseMove)
			} else {
				bounds.selectAll(".voronoi").remove()
			}

			for (var i = intervals.length - 1; i >= 0; i--) {
				const isIntervalHighlighted = isHighlighted[i]
				if (i !== intervalIndex && isIntervalHighlighted) {
					fadeGroup(intervalGroups[i], 0, intervalFadeColors[i])
					fadeGroup(legendGroup.selectAll(`.decade-${intervals[i]}`), 0, legendFadeColors[i])
					isHighlighted[i] = false
				}
			}
			d3.select("#hover-square").style("stroke", "black")
			d3.select("#num-recordigami").text(`${numRecordigami}`).style("opacity", 1)
			highlightGroup(intervalGroup, 0, intervalHighlightColor)
			highlightGroup(legendGroup.selectAll(`.${intervalClass}`), 0, intervalHighlightColor)
			isHighlighted[intervalIndex] = true
		}
	}


	function onRecordigamiMouseEnter(datum) {
		const wins = datum['win']
		const losses = datum['loss']
		const team = datum['team']
		const year = datum['year']
		const primaryColor = datum['primary_color']
		const winPct = getWinPctFromWinsAndLosses(wins, losses)
		hoverSquare
			.attr("transform", `translate(${parseFloat(datum['x']) + PADDING / 2}, ${parseFloat(datum['y']) + PADDING / 2})`)
			.style("opacity", 1)

		hoverWin.text(wins).style("opacity", 1)
		hoverHyphen.style("opacity", 1)
		hoverLoss.text(losses).style("opacity", 1)
		if (![DEFAULT_FILTER_NAME, ''].includes(filterTeam)) {
			hoverTeam.text(`${year}`).style("opacity", 1).style("fill", "black")
			hoverSquare.style("stroke", "black")
		} else {
			hoverTeam.text(`${team} (${year})`).style("opacity", 1).style("fill", primaryColor)
			hoverSquare.style("stroke", "white")
		}
		
		d3.selectAll("*[id^=num-recordigami]").style("opacity", 0)

	}
	function onRecordigamiMouseLeave(datum) {
		hoverSquare.style("opacity", 0)
		hoverWin.style("opacity", 0)
		hoverHyphen.style("opacity", 0)
		hoverLoss.style("opacity", 0)
		// hoverYear.style("opacity", 0)
		hoverTeam.style("opacity", 0)
		d3.selectAll("*[id^=num-recordigami]").style("opacity", 1)
	}

	function onRecordigamiMouseMove(datum) {
		const wins = datum['win']
		const losses = datum['loss']
		const team = datum['team']
		const year = datum['year']
		const [x, y] = d3.mouse(this)
		const mouseLosses = Math.round(xScale.invert(x))
		const mouseWins = Math.round(yScale.invert(y))
		const mouseTotal = mouseLosses + mouseWins
		const primaryColor = datum['primary_color']
		const winPct = getWinPctFromWinsAndLosses(wins, losses)
		if (mouseTotal > 1.15 * NUM_GAMES) {
			hoverSquare.style("opacity", 0)
			hoverWin.text(wins).style("opacity", 0)
			hoverHyphen.style("opacity", 0)
			hoverLoss.text(losses).style("opacity", 0)
			// hoverYear.text(year).style("opacity", 0)
			if (![DEFAULT_FILTER_NAME, ''].includes(filterTeam)) {
				hoverTeam.text(`${year}`).style("opacity", 0).style("fill", "black")
				hoverSquare.style("stroke", "black")
			} else {
				hoverTeam.text(`${team} (${year})`).style("opacity", 0).style("fill", primaryColor)
				hoverSquare.style("stroke", "white")
			}
			d3.selectAll("*[id^=num-recordigami]").style("opacity", 1)

		} else if (mouseTotal <= 1.15 * NUM_GAMES && mouseTotal > NUM_GAMES) {
			
			hoverWin.text(wins).style("opacity", 1)
			hoverHyphen.style("opacity", 1)
			hoverLoss.text(losses).style("opacity", 1)
			if (![DEFAULT_FILTER_NAME, ''].includes(filterTeam)) {
				hoverTeam.text(`${year}`).style("opacity", 1).style("fill", "black")
			} else {
				hoverTeam.text(`${team} (${year})`).style("opacity", 1).style("fill", primaryColor)
			}
			d3.selectAll("*[id^=num-recordigami]").style("opacity", 0)
			hoverSquare.style("opacity", 1)
		}
	}

	if (![DEFAULT_FILTER_NAME, ''].includes(filterTeam)) {
		d3.selectAll("*[id^=num-recordigami").style("opacity", 1).style("display", "block")
		d3.selectAll("#num-recordigami").text(teamNumRecordigami)
		
		if (teamNumRecordigami === 1) {
			bounds.selectAll(".voronoi").remove()
			const gameYear = Object.keys(teamRecordigamiData)[0]
			const game = Object.keys(teamRecordigamiData[gameYear])[0]
			const gameData = teamRecordigamiData[gameYear][game]
			const gameMetadata = [{
				'x': xScale(gameData.loss),
				'y': yScale(gameData.win),
				'team': gameData.team,
				'year': gameData.year,
				'win': gameData.win,
				'loss': gameData.loss,
				'primary_color': gameData.primary_color
			}]
			const voronoiDiagram = bounds.selectAll(".voronoi")
				.data(gameMetadata)
				.enter()
				.append("rect")
					.attr("class", "voronoi")
					.attr("x", 0)
					.attr("width", dimensions.boundedWidth)
					.attr("y", 0)
					.attr("height", dimensions.boundedHeight)
					.on("mousemove", onRecordigamiMouseMove)
					.on("mouseenter", onRecordigamiMouseEnter)
					.on("mouseleave", onRecordigamiMouseLeave)

		} else if (teamNumRecordigami > 1) {
			const teamRecordigamiYears = Object.keys(teamRecordigamiData)
			drawVoronoiWithRetry(teamRecordigamiYears, teamRecordigamiData, xScale, yScale, dimensions, bounds, onRecordigamiMouseEnter, onRecordigamiMouseLeave, onRecordigamiMouseMove)
		} else {
			bounds.selectAll(".voronoi").remove()
		}

	} else if(filterTeam === DEFAULT_FILTER_NAME) {
		d3.selectAll("*[id^=num-recordigami").style("opacity", 1).style("display", "block")
		d3.selectAll("#num-recordigami").text(totalNumRecordigami)
		drawVoronoiWithRetry(recordigamiYears, recordigamiData, xScale, yScale, dimensions, bounds, onRecordigamiMouseEnter, onRecordigamiMouseLeave, onRecordigamiMouseMove)

	} else {
		drawVoronoiWithRetry(recordigamiYears, recordigamiData, xScale, yScale, dimensions, bounds, onRecordigamiMouseEnter, onRecordigamiMouseLeave, onRecordigamiMouseMove)
	}



	const container = d3.select('*[id^=scrolly-]');
	const stepSel = container.selectAll('*[class^=step]');


	enterView({
		selector: stepSel.nodes(),
		offset: 0.6,
		enter: el => {
			const index = parseInt(d3.select(el).attr('data-index'));
			updateChart(index, decadeClasses, decadeHighlightColors, decadeFadeColors, "enter", league);
		},
		exit: el => {
			let index = parseInt(d3.select(el).attr('data-index'));
			updateChart(index, decadeClasses, decadeHighlightColors, decadeFadeColors, "exit", league);
		}
	});


	d3.selectAll('.logo').raise()
}

async function updateChart(index, classIds, highlightColors, fadeColors, stage, league) {
	const animationTime = 1000

	if (index === -2) {
		return
	} else if (index === -1) {
		if (stage === "enter") {
			highlightGroup(d3.select('.interval-tile-1-0'), animationTime, highlightColors[0])
			highlightGroup(d3.select('.interval-tile-0-1'), animationTime, highlightColors[0])
			highlightGroup(d3.selectAll('.legend-0'), animationTime, highlightColors[0])
		}
		if (stage === "exit") {	
			fadeClass(classIds[index + 1], animationTime, fadeColors[index + 1])
		}
	} else if (index === 0) {
		if (stage === "enter") {
			highlightClass(classIds[index], animationTime, highlightColors[index])
		}
		if (stage === "exit") {
			// await fadeClass(classIds[index], animationTime, fadeColors[index])
			d3.selectAll(`.${classIds[index]}`).filter((d, i) => {
					const isOneAndZero = winAccessor(d) === 1 && lossAccessor(d) === 0
					const isZeroAndOne = winAccessor(d) === 0 && lossAccessor(d) === 1
					const isLegendLabel = (LEAGUE === NBA && d === 1940) || (LEAGUE === WNBA && d === 1995)
					const shouldFade = !isOneAndZero && !isZeroAndOne && !isLegendLabel
					return shouldFade
				})
				.transition(`fade-class-${classIds[index]}`)
				.duration(animationTime)
				.style("fill", fadeColors[index])
				.style("stroke", fadeColors[index]).style("stroke-opacity", 0)
			    .end();

		}

	} else if (index === (classIds.length)) {
		if (stage === "exit") {
			highlightClass(classIds[index - 1], 0, highlightColors[index - 1])
			for (var i = 0; i < classIds.length; i++) {
				highlightClass(classIds[i], 0, highlightColors[i])
			}
		}
	} else if (index === (classIds.length + 1)) {
		if (stage === "enter") {
			d3.selectAll(".logo").style("display", "block")
			d3.select(".sticky").style("pointer-events", "all")
			d3.selectAll("*[id^=num-recordigami]").style("opacity", 1).style("display", "block")
			d3.select("#basketball-autocomplete").style("visibility", "visible")
			if (DEFAULT_TEAM !== "" && DEFAULT_TEAM !== DEFAULT_FILTER_NAME) {
				d3.select(".exit-icon").style("visibility", "visible").style("pointer-events", "all")
				drawRecordigami(LEAGUE)
			}
		}
		if (stage === "exit") {
			d3.selectAll(".logo").style("display", "none")
			d3.select(".sticky").style("pointer-events", "none")
			d3.selectAll("*[id^=num-recordigami]").style("opacity", 0).style("display", "none")
			d3.select("#basketball-autocomplete").style("visibility", "hidden")
			d3.select(".exit-icon").style("visibility", "hidden").style("pointer-events", "none")
		}
	} else if (index < (classIds.length)) {
		if (stage === "enter") {
			highlightClass(classIds[index], animationTime, highlightColors[index])
		}
		if (stage === "exit") {
			highlightClass(classIds[index - 1], 0, highlightColors[index - 1])
			fadeClass(classIds[index], animationTime, fadeColors[index])
		}
	}
}


export default { init, resize };
