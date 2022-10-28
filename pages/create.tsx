import React, { useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import {
  useContract,
  MediaRenderer,
  useNetwork,
  useNetworkMismatch,
  useOwnedNFTs,
  useCreateAuctionListing,
  useCreateDirectListing,
  useAddress,
} from "@thirdweb-dev/react";
import network from "../utils/network";
import { NFT, NATIVE_TOKEN_ADDRESS } from "@thirdweb-dev/sdk";

type Props = {};

const Create = (props: Props) => {
  const address = useAddress();
  const router = useRouter();
  const networkMismatch = useNetworkMismatch();
  const [, switchNetwork] = useNetwork();
  const [selectedNft, setSelectedNft] = useState<NFT>();

  const { contract } = useContract(process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT, "marketplace");
  const { contract: collectionContract } = useContract(process.env.NEXT_PUBLIC_COLLECTION_CONTRACT, "nft-collection");
  const ownedNfts = useOwnedNFTs(collectionContract, address);

  const { mutate: createAuctionListing, isLoading, error } = useCreateAuctionListing(contract);
  const {
    mutate: createDirectListing,
    isLoading: isLoadingDirect,
    error: errorDirect,
  } = useCreateDirectListing(contract);

  // This function gets called when the form is submitted.
  // The user provided:
  // - contract address
  // - token id
  // - type of listing (either auction or direct)
  // - price of the NFT
  // This function gets called when the form is submitted
  const handleCreateListing = async (e: React.FormEvent<HTMLFormElement>) => {
    if (networkMismatch) {
      switchNetwork && switchNetwork(network);
      return;
    }

    if (!selectedNft) return;

    const target = e.target as typeof e.target & {
      elements: { listingType: { value: string }; price: { value: string } };
    };

    const { listingType, price } = target.elements;

    if (listingType.value === "directListing") {
      createDirectListing(
        {
          assetContractAddress: process.env.NEXT_PUBLIC_COLLECTION_CONTRACT!,
          tokenId: selectedNft.metadata.id,
          currencyContractAddress: NATIVE_TOKEN_ADDRESS,
          listingDurationInSeconds: 60 * 60 * 24 * 7, // 1 week
          quantity: 1,
          buyoutPricePerToken: price.value,
          startTimestamp: new Date(),
        },
        {
          onSuccess(data, variables, context) {
            console.log("SUCCESS", data, variables, context);
            router.push("/");
          },
          onError(error, variables, context) {
            console.log("ERROR", error, variables, context);
          },
        }
      );
    }

    if (listingType.value === "auctionListing") {
      createAuctionListing(
        {
          assetContractAddress: process.env.NEXT_PUBLIC_COLLECTION_CONTRACT!,
          tokenId: selectedNft.metadata.id,
          currencyContractAddress: NATIVE_TOKEN_ADDRESS,
          listingDurationInSeconds: 60 * 60 * 24 * 7, // 1 week
          quantity: 1,
          buyoutPricePerToken: price.value,
          startTimestamp: new Date(),
          reservePricePerToken: 0,
        },
        {
          onSuccess(data, variables, context) {
            console.log("SUCCESS", data, variables, context);
            router.push("/");
          },
          onError(error, variables, context) {
            console.log("ERROR", error, variables, context);
          },
        }
      );
    }
  };

  return (
    <div>
      <Header />

      <main className="max-w-6xl mx-auto p-10 pt-2">
        <h1 className="text-4xl font-bold">List an Item</h1>
        <h2 className="text-xl pt-5 font-semibold">Select an Item you would like to Sell</h2>

        <hr className="mb-5" />

        <p>Below you find the NFT's you own in your wallet</p>

        <div className="flex overflow-x-scroll space-x-2 p-4">
          {ownedNfts?.data?.map((nft) => (
            <div
              key={nft.metadata.id}
              onClick={() => setSelectedNft(nft)}
              className={`flex flex-col space-y-2 card min-w-fit border-2 bg-gray-100 ${
                nft.metadata.id === selectedNft?.metadata.id ? "border-black" : "border-transparent"
              }`}
            >
              <MediaRenderer className="h-48 rounded-lg" src={nft.metadata.image} />
              <p className="text-lg truncate font-bold">{nft.metadata.name}</p>
              <p className="text-xs truncate">{nft.metadata.description}</p>
            </div>
          ))}
        </div>

        {selectedNft && (
          <form onSubmit={handleCreateListing}>
            <div className="flex flex-col p-10">
              <div className="grid grid-cols-2 gap-5">
                <label className="border-r font-light">Direct Listin / Fixed Price</label>
                <input className="ml-auto h-10 w-10" type="radio" name="listingType" value="directListing" />

                <label className="border-r font-light">Auction</label>
                <input className="ml-auto h-10 w-10" type="radio" name="listingType" value="auctionListing" />

                <label className="border-r font-light">Price</label>
                <input name="price" type="text" placeholder="0.05" className="bg-gray-100 p-5" />
              </div>
              <button type="submit" className="bg-blue-600 text-white rounded-lg p-4 mt-8">
                Create Listing
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default Create;
