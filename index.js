const acsignature = require('ac-signature')
const axios = require('axios')
const prompts = require('prompts');

 const config = require('./config/env/development')
 const _ = require('lodash')


const createBook = async() => {
  const functionName = _.padEnd('ISBN', 15)
  const padLength = 25
  const localDevelopment = _.get(config, 'localDevelopment', false)

  const ingest = await prompts({
    type: 'number',
    name: 'value',
    message: 'Enter ISBN?',
    validate: (val) => {
      if (val > 128) return true
    }
  })
  const isbn = _.get(ingest, 'value')

  const environment = _.get(process.env, 'NODE_ENV', 'development')
  let apiUrl = 'https://api.admiralcloud.com'
  if (environment === 'development') apiUrl = 'https://apidev.admiralcloud.com'
  if (localDevelopment) apiUrl = 'http://localhost:8080'


  // HELPER FUNCTION
  // const x = await callAPI({ path: '/v5/user', controller: 'user', action: 'find', payload: { email: 'xxx' } })
  const callAPI = async (params) => {
    const path = _.get(params, 'path')
    const method = _.get(params, 'method', 'get')
    const payload = _.get(params, 'payload')
    const controller = _.get(params, 'controller')
    const action = _.get(params, 'action')

    let signature = acsignature.sign({
      accessSecret: _.get(config, 'accessSecret'),
      controller,
      action,
      payload
    })

    const headers = {
      'x-admiralcloud-clientId': _.get(config, 'clientId'),
      'x-admiralcloud-accesskey': _.get(config, 'accessKey'),
      'x-admiralcloud-identifier': _.get(config, 'identifier'),
      'x-admiralcloud-rts': signature.timestamp,
      'x-admiralcloud-hash': signature.hash   
    }
    let axiosParams = {
      method,
      baseURL: apiUrl,
      url: path,
      headers
    }
    //console.log(74, axiosParams)
    if (method !== 'get' && !_.isEmpty(payload)) axiosParams.data = payload

    const response = await axios(axiosParams)
    return _.get(response, 'data')
  } 


  // Request data from ISBN service
  let axiosParams = {
    method: 'get',
    url: `https://api2.isbndb.com/book/${isbn}`,
    headers: {
      Authorization: _.get(config, 'isbndb.authorization')
    }
  }

  const response = await axios(axiosParams)
  const book = _.get(response, 'data.book')
  //console.log(74, book)
/*
  const book = {
    isbn13: '9783440148440',
    isbn: '3440148440',
    publisher: 'Franckh-Kosmos',
    binding: 'Hardcover',
    title_long: 'Die drei ??? Das weiße Grab (drei Fragezeichen)',
    title: 'Die drei ??? Das weiße Grab (drei Fragezeichen)',
    language: 'en_US',
    publish_date: '2018-09-13T00:00:01Z',
    date_published: '2018-09-13T00:00:01Z',
    dimensions: 'Height: 7.67715 Inches, Length: 5.19684 Inches, Weight: 0.59304348478 Pounds, Width: 0.70866 Inches',
    msrp: 0,
    authors: [ 'Nevis, Ben' ],
    image: 'https://images.isbndb.com/covers/84/40/9783440148440.jpg'
  }
  */

  // create the mediacontainer
  let mediaContainerId
  try {
    let payload = {
      type: 'document',
      subtype: 'book',
      controlGroups: [1]
    }
    let response = await callAPI({ path: '/v5/mediacontainer', method: 'post', controller: 'mediacontainer', action: 'create', payload })
    mediaContainerId = _.get(response, 'id')
  }
  catch(e) {
    console.log('%s | %s | %s | Failed %j', functionName, _.padEnd('MediaContainer', padLength), e)
    throw e 
  }


  const fieldMapping = [
    { field: 'isbn13', acField: 'meta_isbn13' },
    { field: 'publisher', acField: 'meta_publisher' },
    { field: 'title_long', acField: 'container_name' },
    { field: 'date_published', acField: 'meta_publicationDate' },
    { field: 'authors', acField: 'meta_author', type: 'array' }
  ]
  for (let i = 0; i < fieldMapping.length; i++) {
    const title = fieldMapping[i].acField
    let content = _.get(book, fieldMapping[i].field)
    if (fieldMapping[i].type === 'array') content = _.join(content, ', ')
    let payload = {
      mediaContainerId,
      language: 'uni',
      title,
      content
    }
    try {
      await callAPI({ path: '/v5/metadata', method: 'post', controller: 'metadata', action: 'create', payload })
    }
    catch(e) {
      console.log('%s | %s | MC %s | %s | Failed %j', functionName, _.padEnd('Metadata', padLength), mediaContainerId, title, e)
      throw e 
    }
  }

  // create media and upload
  let media
  try {
    let payload = {
      mediaContainerId,
      type: 'document',
      source: 'user'
    }
    media = await callAPI({ path: '/v5/media', method: 'post', controller: 'media', action: 'create', payload })
  }
  catch(e) {
    console.log('%s | %s | MC %s | Failed %j', functionName, _.padEnd('Media', padLength), mediaContainerId, e)
    throw e 
  }

  // upload from URL
  try {
    let payload = {
      mediaId: _.get(media, 'id'),
      source: _.get(book, 'image'),
      mediaContainerId
    }
    await callAPI({ path: `/v5/media/${mediaContainerId}/upload`, method: 'post', controller: 'media', action: 'upload', payload })
  }
  catch(e) {
    console.log('%s | %s | MC %s | Failed %j', functionName, _.padEnd('URLUpload', padLength), mediaContainerId, e)
    throw e 
  }

  createBook()
}

// start the process
createBook()
