// Adds hours, minutes and seconds to a date and returns a new Date object 
Date.prototype.addTime = function(h, m, s){
    return new Date(this.getTime() + (h*60*60*1000) + (m*60*1000) + (s*1000))
}

// check if url matches regex expression
const isUrlValid = (url) => {
    return /^(?:https:\/\/)?clips\.twitch\.tv\/(\S+)$/.test(url)
}

// check if data array is not empty
const isDataNotEmpty = (data) => {
    return data.length !== 0
}

// calculate the end date of a vod
const addTimeToDate = (date, arr) => {
    return date.addTime(...arr)
}

// returns the difference between 2 dates in hours, minutes, seconds
const dateDiff = (date1, date2) => {
    // subtract 30 seconds to account for the delay when creating a clip
    let ms = new Date(Math.abs(date1 - date2 - 30000))

    let s = Math.floor(ms / 1000)
    let m = Math.floor(s / 60)
    s %= 60
    let h = Math.floor(m / 60)
    m %= 60

    return { h, m, s }
}

module.exports = { isUrlValid, isDataNotEmpty, addTimeToDate, dateDiff }