import {SkillBuilders, DefaultApiClient, RequestHandler} from "ask-sdk";

import { processText } from "./common";


async function processAlexaListItem(list, itemId, listServiceClient): Promise<void> {
  const {value} = await listServiceClient.getListItem(list.listId, itemId)
  await processText(`${value} ${list.name}`)
}


const ItemsCreatedHandler: RequestHandler = {
  canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'AlexaHouseholdListEvent.ItemsCreated'
  },
  async handle(handlerInput) {
      const listServiceClient = handlerInput.serviceClientFactory!.getListManagementServiceClient();
      const request = handlerInput.requestEnvelope.request as any
      const {listItemIds, listId} = request.body
      const listsMetadata: any = await listServiceClient.getListsMetadata()

      const list = listsMetadata.lists.find(list => list.listId === listId)

      await Promise.all(listItemIds.map(itemId => processAlexaListItem(list, itemId, listServiceClient)))

      return handlerInput.responseBuilder.getResponse();
  }
}


const DoNothingHandler: RequestHandler = {
  canHandle(handlerInput) {
      return true
  },
  handle(handlerInput) {
    console.log('Doing nothing')
    console.log(handlerInput.requestEnvelope)
    return handlerInput.responseBuilder.getResponse();
  },
}


const skillBuilder = SkillBuilders.custom();
export const onAlexaInvocation = skillBuilder.addRequestHandlers(
    ItemsCreatedHandler,
    DoNothingHandler,
  )
  .withApiClient(new DefaultApiClient())
  .lambda()

