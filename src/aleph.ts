import { Get, Publish } from "aleph-sdk-ts/dist/messages/post";
import { config } from "./config";
import { Dataset, Payment } from "./types";
import { ItemType } from "aleph-sdk-ts/dist/messages/types";

export async function getDataset(datasetId: string): Promise<Dataset> {
  try {
    const response = await Get<Dataset>({
      types: "Dataset",
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

export async function grantPermission(
  payment: Payment,
  timeseriesIDs: string[]
): Promise<string[]> {
  try {
    console.log(
      `New permission granted for the payment ${JSON.stringify(payment)}`
    );

    const promises = [];
    for (const timeseriesID of timeseriesIDs) {
      const postConfig = {
        account: config.SOL_ACCOUNT,
        postType: "Permission",
        content: {
          authorizer: payment.seller,
          requestor: payment.signer,
          datasetID: payment.datasetId,
          timeseriesID,
          status: "GRANTED",
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
