import React, { useEffect, useState } from 'react';
import { ApiPromise, WsProvider } from "@polkadot/api";

// Number of auctions to display in drop-down
const auctionCount = 2;
const firstAuctionBlockDot = 7658910;
const firstAuctionBlockKsm = 7924237;

// Generated at run-time
let chain = undefined;
let wsProvider = undefined;
let api = undefined;
let auctionSelections = [];

function AuctionSchedule() {
	const [auctions, setAuctions] = useState("Loading Auctions...");

	useEffect(async () => {
		const title = document.title;

		// Polkadot
		if (title === "Parachain Slot Auctions · Polkadot Wiki") {
			// Set chain type
			chain = "polkadot"
			wsProvider = new WsProvider("wss://rpc.polkadot.io");
			await Connect(wsProvider, firstAuctionBlockDot, setAuctions);
		} else if (title === "Parachain Slot Auctions · Guide") {
			chain = "kusama";
			wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io/");
			await Connect(wsProvider, firstAuctionBlockKsm, setAuctions);
		} else {
			console.log("Unknown wiki/guide type");
		}
	}, []);

	if (chain !== undefined) {
		return auctions;
	} else {
		return (<div>Loading Auctions...</div>)
	}
}

async function Connect(wsProvider,  initialBlock, setAuctions) {
	api = await ApiPromise.create({ provider: wsProvider });

	// Get the current block for projection
	const currentBlock = await api.rpc.chain.getBlock();
	const currentBlockNumber = parseInt(currentBlock.block.header.number.toString());

	// Get current date/time
	let date = new Date();

	// Get ending period for the given chain
	const endPeriod = parseInt(api.consts.auctions.endingPeriod.toString());

	// Add starting block for the given chain
	let auctions = [];
	let auctionBlocks = [];
	auctionBlocks.push(initialBlock);

	// Build auction objects with all required values for UI
	for (let i = 0; i < auctionCount; i++) {
		let auction = {};
		auction.startBlock = auctionBlocks[auctionBlocks.length - 1];
		auction.startHash = (await api.rpc.chain.getBlockHash(auction.startBlock)).toString();
		const apiAt = await api.at(auction.startHash);
		const [lease, end] = (await apiAt.query.auctions.auctionInfo()).toJSON();

		auction.weeksLeased = parseInt(lease);
		auction.endPeriodBlock = parseInt(end);
		auction.biddingEndsBlock = auction.endPeriodBlock + endPeriod;
		auction.startDate = EstimateBlockDate(date, currentBlockNumber, auction.startBlock);
		auction.endPeriodDate = EstimateBlockDate(date, currentBlockNumber, auction.endPeriodBlock);
		auction.biddingEndsDate = EstimateBlockDate(date, currentBlockNumber, auction.biddingEndsBlock);

		// TODO - how to get his value?
		auction.startOnBoard = "December 17th, 2021";
		auction.endOnBoard = "October 20th, 2023";
		//auction.endOnBoard = auction.weeksLeased * 7 + auction.startOnBoard;

		// Calculate next starting block
		auction.nextStartingBlock = auction.biddingEndsBlock + 3600; // TODO: Get 3600 on-chain??
		auctionBlocks.push(auction.nextStartingBlock);
		auctions.push(auction);

		// Drop-down option
		let option = <option value={i} key={i}>{`Auction #${i + 1} - ${auction.startDate.toDateString()}`}</option>
		auctionSelections.push(option);
	}

	Update(auctions, setAuctions, { target: { value: 0 } });
}

function Update(auctions, setAuctions, event) {
	const index = event.target.value;

	// First child in select is rendered by default
	const content = <div>
		<select id="AuctionSelector" onChange={(e) => Update(auctions, setAuctions, e)} style={{ border: '2px solid #e6007a', height: '40px' }}>
			{auctionSelections.map((option) => (option))}
		</select>
		<hr />
		<b>Auction Starts:</b>
		<br />
		{`${auctions[index].startDate.toDateString()} - `}
		<a href={`https://polkadot.subscan.io/block/${auctions[index].startBlock.toString()}`}>
			Block #{auctions[index].startBlock.toString()}
		</a>
		<hr />
		<b>Auction Ends:</b>
		<br />
		{`${auctions[index].endPeriodDate.toDateString()} - `}
		<a href={`https://polkadot.subscan.io/block/${auctions[index].endPeriodBlock.toString()}`}>
			Block #{auctions[index].endPeriodBlock.toString()}
		</a>
		<hr />
		<b>Bidding Ends:</b>
		<br />
		{`${auctions[index].biddingEndsDate.toDateString()} - `}
		<a href={`https://polkadot.subscan.io/block/${auctions[index].biddingEndsBlock.toString()}`}>
			Block #{auctions[index].biddingEndsBlock.toString()}
		</a>
		<hr />
		<b>Winning parachain(s) onboarded:</b>
		<br />
		{auctions[0].startOnBoard} for the period {auctions[0].startOnBoard} to {auctions[0].endOnBoard}
		<hr />
	</div>

	setAuctions(content);
}

function EstimateBlockDate(date, currentBlock, estimatedBlock) {
	const blockDifference = parseInt(estimatedBlock) - currentBlock;
	const seconds = blockDifference * 6 // 6 seconds per block
	let dateCopy = new Date(date.valueOf())
	dateCopy.setSeconds(dateCopy.getSeconds() + seconds);
	return dateCopy;
}

export default AuctionSchedule;