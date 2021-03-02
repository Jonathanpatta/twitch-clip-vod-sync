const axios = require('axios')
const utils = require('./utils')

// create an axios instance to use the twitch api
const instance = axios.create({
    baseURL: process.env.BASE_URL,
    headers: {
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Client-Id': process.env.CLIENT_ID
    }
})

// create another axios instance to use the old twitch api to get a vod timestamp through a clip
// the new twitch api does not provide this info
const instance2 = axios.create({
    baseURL: process.env.BASE_URL_2,
    headers: {
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Client-ID': process.env.CLIENT_ID
    }
})

// get the streamer id and display name based on the username passed as parameter
const getStreamerInfo = async (username) => {
    try{
        // send request to /users endpoint to get the data for the specified username
        const userData = await instance.get(`/users?login=${username}`)

        // check if the user exists
        if(utils.isDataEmpty(userData.data.data)) throw new Error('User does not exist')

        const { id, display_name } = userData.data.data[0]

        return { id, display_name }

    }catch(err){
        throw err
    }
}

// get the exact date of when a clip/vod happened
// if the url is a clip, get the vod timestamp of when the clip happened and use it to get the exact date
// if the url is a vod, get the the vod timestamp and use it to get the exact date
const getExactDate = async (url) => {
    try{
        const vod = {}

        if(url.includes('clips')){
            // extract clip id from the url
            const clipId = url.substring(url.lastIndexOf('/') + 1)
    
            // send request to /clips endpoint to get the data for the specified clip id
            const clipData = await instance2.get(`/clips/${clipId}`)
    
            // get the vod
            const vodData = clipData.data.vod
    
            // Check if the vod still exists
            if(!vodData) throw new Error('The vod for this clip has been removed')
    
            vod.id = vodData.id
            vod.url = vodData.url
    
        }else{
            // extract vod id from the url
            vod.id = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('?'))
            vod.url = url
        }
    
        // send request to /videos endpoint to get the data for the specified vod id
        const vodInfo = await instance.get(`/videos?id=${vod.id}`)
    
        // get the vod start date
        const vodStart = vodInfo.data.data[0]['created_at']
    
        // separate the vod timestamp hours, minutes, seconds into an array
        const timeStampArr = vod.url.substring(vod.url.lastIndexOf('=') + 1).split(/[hms]+/)
    
        // add the vod timestamp to the start date of the vod
        return utils.addTimeToDate(new Date(vodStart), timeStampArr)

    }catch(err){
        throw err
    }
}

// get the vod synced with the date of the clip/vod if the streamer was streaming
const getSyncedVod= async (streamerInfo, exactDate) => {
    try{
        // send request to /videos endpoint to get the the VODs for the specified streamer
        const vodsData = await instance.get(`/videos?user_id=${streamerInfo.id}`)

        // check if the streamer has any vods
        if(utils.isDataEmpty(vodsData.data.data)) throw new Error(`${streamerInfo.display_name} does not have any available VODs`)

        const vod = findVod(vodsData.data.data, exactDate)

        // check if a vod is found
        if(!vod) throw new Error(`${streamerInfo.display_name} was not streaming at the time of the clip/vod or the vod was deleted`)

        // calculate the difference between the date and the vod start date
        const { h, m, s } = utils.dateDiff(exactDate, vod.startDate)
        
        // return the final vod url with the timestamp
        return `${vod.url}?t=${h}h${m}m${s}s`

    }catch(err){
        throw err
    }
}

// find a vod
const findVod = (vods, exactDate) => {
    for(vod of vods){
        // separate duration hours, minutes, seconds into an array
        const hoursArr = vod.duration.split(/[hms]+/)

        // get the vod start date
        const vodStart = new Date(vod['created_at'])

        // get the vod end date
        const vodEnd = utils.addTimeToDate(vodStart, hoursArr)

        // if the date is in between the start and end dates return vod info
        if(exactDate.getTime() >= vodStart.getTime() && exactDate.getTime() <= vodEnd.getTime()){
            return {
                url: vod.url,
                startDate: vodStart
            }
        }
    }
    return false
}

module.exports = { getExactDate, getStreamerInfo, getSyncedVod }

