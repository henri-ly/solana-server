import { Get, Publish } from 'aleph-sdk-ts/dist/messages/post';
import { config } from './config';
import { Dataset, Payment } from './types';
import { ItemType } from 'aleph-sdk-ts/dist/messages/types';

export async function getDataset(datasetId: string): Promise<Dataset> {
  try {
    const response = await Get<Dataset>({
      types: 'Dataset',
      pagination: 1,
      page: 1,
      hashes: [datasetId],
      APIServer: config.ALEPH_SERVER,
    });

    return response.posts[0].content;
  } catch (error) {
    const message = `Error fetching dataset with ID ${datasetId}: ${error}`;
    console.error(message);
    throw Error(message);
  }
}

export async function grantPermission(payment: Payment): Promise<string[]> {
  try {
    const dataset = await getDataset(payment.datasetId);
    if (!dataset?.timeseriesIDs) throw Error('Dataset has no timeseries');

    console.log(`New permission granted for the payment ${JSON.stringify(payment)}`)

    const promises = [];
    for (const timeseriesIDs of dataset?.timeseriesIDs) {
      const postConfig = {
        account: config.SOL_ACCOUNT,
        postType: 'Permission',
        content: {
          authorizer: dataset.owner,
          requestor: payment.signer,
          datasetID: payment.datasetId,
          timeseriesIDs,
          status: 'GRANTED',
        },
        channel: config.FISHNET_CHANNEL,
        APIServer: config.ALEPH_SERVER,
        storageEngine: ItemType.inline,
        inlineRequested: true,
      };
  
      promises.push(Publish(postConfig));
    }
    
    const responses = await Promise.all(promises);
    return responses.map((post) => post.item_hash);
  } catch (error) {
    const message = `Error posting permission message: ${error}`;
    console.error(message);
    throw Error(message);
  }
}

