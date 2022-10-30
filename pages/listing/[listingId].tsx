import { UserCircleIcon } from "@heroicons/react/24/solid";
import {
  MediaRenderer,
  useBuyNow,
  useContract,
  useListing,
  useNetwork,
  useNetworkMismatch,
  useMakeOffer,
  useOffers,
  useMakeBid,
  useAddress,
  useAcceptDirectListingOffer,
} from "@thirdweb-dev/react";
import { ListingType, NATIVE_TOKENS } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import Countdown from "react-countdown";
import Header from "../../components/Header";
import network from "../../utils/network";
import toast, { Toaster } from "react-hot-toast";

const ListingPage = () => {
  const router = useRouter();
  const address = useAddress();

  const networkMismatch = useNetworkMismatch();
  const [, switchNetwork] = useNetwork();

  const [bidAmount, setBidAmount] = useState("");
  const [minimumNextBid, setMinimumNextBid] = useState<{
    displayValue: string;
    symbol: string;
  }>();

  const { listingId } = router.query as { listingId: string };

  const { contract } = useContract(process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT, "marketplace");

  //   Mutate hooks
  const { mutate: buyNow, isLoading: isBuyNowLoading } = useBuyNow(contract);
  const { mutate: makeOffer } = useMakeOffer(contract);
  const { mutate: makeBid } = useMakeBid(contract);
  const { mutate: acceptOffer } = useAcceptDirectListingOffer(contract);

  //   Data hooks
  const { data: offers } = useOffers(contract, listingId);
  const { data: listing, isLoading, error } = useListing(contract, listingId);

  useEffect(() => {
    if (!listing?.id || !contract || !listing) return;

    if (listing.type === ListingType.Auction) {
      fetchMinNextBid();
    }
  }, [listing, contract, listingId]);

  const fetchMinNextBid = async () => {
    if (!listing || !contract) return;

    const { displayValue, symbol } = await contract.auction.getMinimumNextBid(listingId);

    setMinimumNextBid({
      displayValue: displayValue,
      symbol: symbol,
    });
  };

  const formatPlaceholder = () => {
    if (!listing) return;
    if (listing?.type === ListingType.Direct) {
      return "Enter Offer Amount";
    }

    if (listing.type === ListingType.Auction) {
      return Number(minimumNextBid?.displayValue) === 0
        ? "Enter Bid Amount"
        : `${minimumNextBid?.displayValue} ${minimumNextBid?.symbol} or more`;
    }
  };

  const buyNft = async () => {
    if (networkMismatch) {
      switchNetwork && switchNetwork(network);
      return;
    }

    if (!listingId || !contract || !listing) return;

    const toastId = toast.loading("Buying NFT");

    await buyNow(
      {
        id: listingId,
        buyAmount: 1,
        type: listing.type,
      },
      {
        onSuccess(data, variables, context) {
          toast.remove(toastId);
          toast.success("NFT bought successfully!");
          router.replace("/");
        },
        onError(error, variables, context) {
          toast.remove(toastId);
          toast.error("NFT could not be bought");
        },
      }
    );
  };

  const createBidOrOffer = async () => {
    try {
      if (networkMismatch) {
        switchNetwork && switchNetwork(network);
        return;
      }

      // Direct listing
      if (listing?.type === ListingType.Direct) {
        if (listing.buyoutPrice.toString() === ethers.utils.parseEther(bidAmount).toString()) {
          buyNft();
          return;
        }

        const toastId = toast.loading("Making offer...");

        await makeOffer(
          {
            quantity: 1,
            listingId,
            pricePerToken: bidAmount,
          },
          {
            onSuccess(data, variables, context) {
              toast.remove(toastId);
              toast.success("Offer made successfully!");
              setBidAmount("");
            },
            onError(error, variables, context) {
              toast.remove(toastId);
              toast.error("Offer could not be made");
            },
          }
        );
      }

      // Auction listing
      if (listing?.type === ListingType.Auction) {
        const toastId = toast.loading("Making bid...");

        await makeBid(
          {
            listingId,
            bid: bidAmount,
          },
          {
            onSuccess(data, variables, context) {
              toast.remove(toastId);
              toast.success("Bid made successfully!");
              setBidAmount("");
            },
            onError(error, variables, context) {
              toast.remove(toastId);
              toast.error("Bid could not be made");
            },
          }
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading)
    return (
      <div>
        <Header />
        <div className="text-center animate-pulse text-blue-500">
          <p>Loading Item...</p>
        </div>
      </div>
    );

  if (!listing) {
    return <div>Listing not found</div>;
  }

  return (
    <div>
      <Header />

      <Toaster position="top-center" />

      <main className="max-w-6xl mx-auto p-2 flex flex-col lg:flex-row space-y-10 space-x-5 pr-10">
        <div className="p-10 border mx-auto lg:mx-0 max-w-md lg:max-w-xl">
          <MediaRenderer src={listing.asset.image} />
        </div>

        <section className="flex-1 space-y-5 pb-20 lg:pb-0">
          <div>
            <h1 className="text-xl font-bold">{listing.asset.name}</h1>
            <p className="text-gray-600">{listing.asset.description}</p>
            <p className="flex items-center text-xs sm:text-base">
              <UserCircleIcon className="h-5 " />
              <span className="font-bold pr-1">Seller:</span>
              {listing.sellerAddress}
            </p>
          </div>

          <div className="grid grid-cols-2 items-center py-2">
            <p className="font-bold">Listing Type:</p>
            <p>{listing.type === ListingType.Direct ? "Direct Listing" : "Auction Listing"}</p>

            <p className="font-bold">Buy it Now Price:</p>
            <p className="text-4xl font-bold">
              {listing.buyoutCurrencyValuePerToken.displayValue} {listing.buyoutCurrencyValuePerToken.symbol}
            </p>

            <button
              onClick={buyNft}
              className="col-start-2 mt-2 bg-blue-600 font-bold text-white rounded-full w-44 py-4 px-10"
            >
              Buy Now
            </button>
          </div>

          {listing.type === ListingType.Direct && offers && (
            <div className="grid grid-cols-2 gap-y-2">
              <p className="font-bold">Offers:</p>
              <p className="font-bold">{offers.length > 0 ? offers.length : 0}</p>

              {offers.map((offer) => (
                <>
                  <p className="flex items-center ml-5 text-sm italic">
                    <UserCircleIcon className="h-2 mr-2" />
                    {offer.offeror.slice(0, 5) + "..." + offer.offeror.slice(-5)}
                  </p>
                  <div>
                    <p
                      key={offer.listingId + offer.offeror + offer.totalOfferAmount.toString()}
                      className="italic text-sm"
                    >
                      {ethers.utils.formatEther(offer.totalOfferAmount)}
                      {NATIVE_TOKENS[network].symbol}
                    </p>

                    {listing.sellerAddress === address && (
                      <button
                        className="p-2 w-32 bg-red-500/5- rounded-lg cursor-pointer font-bold"
                        onClick={() => {
                          acceptOffer(
                            {
                              listingId,
                              addressOfOfferor: offer.offeror,
                            },
                            {
                              onSuccess(data, variables, context) {
                                toast.success("Offer accepted successfully!");
                                router.replace("/");
                              },
                              onError(error, variables, context) {
                                toast.error("Offer could not be accepted");
                              },
                            }
                          );
                        }}
                      >
                        Accept Offer
                      </button>
                    )}
                  </div>
                </>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 space-y-2 items-center justify-end">
            <hr className="col-span-2" />

            <p className="col-span-2 font-bold">
              {listing.type === ListingType.Direct ? "Make an Offer" : "Bid on this Auction"}
            </p>

            {listing.type === ListingType.Auction && (
              <>
                <p>Current Minimum Bid:</p>
                <p className="font-bold">
                  {minimumNextBid?.displayValue} {minimumNextBid?.symbol}
                </p>

                <p>Time Remaining:</p>
                <Countdown date={Number(listing.endTimeInEpochSeconds.toString()) * 1000} />
              </>
            )}

            <input
              onChange={(e) => setBidAmount(e.target.value)}
              className="border p-2 rounded-lg mr-5"
              type="text"
              placeholder={formatPlaceholder()}
            />
            <button onClick={createBidOrOffer} className="bg-red-600 font-bold rounded-full text-white w-44 py-4 px-10">
              {listing.type === ListingType.Direct ? "Offer" : "Bid"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ListingPage;
