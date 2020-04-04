import Vue from "vue";
import { Module, GetterTree, MutationTree, ActionTree } from "vuex";
import { RootState } from "../../index";
import ConnectionManager from '@/managers/ConnectionManager';
import { uuid } from "uuidv4";

const ROOM_STORE_TAG = "room-store";

// -------------------------
// --- Type Declarations ---
// -------------------------

interface Client {
    id: string;
    nickname: string;
    uploadedChunks: number;
    state: "ready" | "downloading" | "loading" | "syncing" | "error";
    _prevState: "ready" | "downloading" | "loading" | "syncing" | "error";
}

export interface RoomState {
    isConnected: boolean;
    isOwner: boolean;
    connectionManager: ConnectionManager;
    connectedClients: Client[];
    roomName: string;
    timesynced: boolean;
}

export enum Getters {
    isConnected = "isConnected",
    isOwner = "isOwner",
    connectedClients = "connectedClients",
    id = "id",
    connectionManager = "connectionManager",
    roomName = "roomName",
    timesynced = "timesynced"
}

export enum Mutations {}

export enum Actions {}

export interface MapGettersStructure {
    [Getters.isConnected]: boolean;
    [Getters.isOwner]: boolean;
    [Getters.connectedClients]: string[];
    [Getters.id]: string | null;
    [Getters.connectionManager]: ConnectionManager;
    [Getters.roomName]: string;
    [Getters.timesynced]: boolean;
}

export interface MapMutationsStructure {}

export interface MapActionsStructure {}


// ------------------------
// --- Helper Functions ---
// ------------------------
function setupConnectionManagerListeners(state: RoomState, connectionManager: ConnectionManager) {
    connectionManager.addEventListener("client-joined", ({ clientId }) => {
        const idx = state.connectedClients.findIndex(data => data.id === clientId);

        // Add client to connected clients list
        if (idx < 0) {
            const clientData: Client = {
                id: clientId,
                nickname: connectionManager.getClientNickname(clientId)!,
                state: "syncing",
                _prevState: "ready",
                uploadedChunks: 0
            }

            state.connectedClients.push(clientData);
            Vue.set(state, "connectedClients", state.connectedClients);
        }
    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("client-left", ({ clientId }) => {
        console.log("Room store: client left", clientId);
        // Remove client from the clients list
        const idx = state.connectedClients.findIndex(data => data.id === clientId);
        if (idx >= 0) Vue.delete(state.connectedClients, idx);
    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("clienttimesyncchanged", ({ clientId, timesynced }) => {
        const idx = state.connectedClients.findIndex(data => data.id === clientId);
        if (idx >= 0) {
            const clientData = { ...state.connectedClients[idx] };
            if (timesynced == false) {
                clientData._prevState = clientData.state;
                clientData.state = "syncing";
            } else {
                clientData.state = clientData._prevState;
                clientData._prevState = "syncing";
            }
            Vue.set(state.connectedClients, idx, clientData);
        }

    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("audiofilesyncing", ({ clients }) => {
        const connectedClientsClone = { ...state.connectedClients };

        // Set all target clients to downloading state
        clients.forEach(clientId => {
            const idx = connectedClientsClone.findIndex(data => data.id === clientId);

            if (idx > 0) {
                const clientData = connectedClientsClone[idx];
                clientData._prevState = clientData.state;
                clientData.state = "downloading";
                clientData.uploadedChunks = 0;
            }
        });

        // Update connected clients state
        Vue.set(state, "connectedClients", connectedClientsClone);
    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("clientreceivedaudiochunk", (clientId) => {
        // Add to the uploaded chunk counter for the given client
        const idx = state.connectedClients.findIndex(data => data.id === clientId);
        if (idx >= 0) {
            const clientData = { ...state.connectedClients[idx] };
            clientData.uploadedChunks++;
            Vue.set(state.connectedClients, idx, clientData);
        }
    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("clientreceivedaudiofile", (clientId) => {
        // Set to loading state
        const idx = state.connectedClients.findIndex(data => data.id === clientId);
        if (idx >= 0) {
            const clientData = { ...state.connectedClients[idx] };
            clientData._prevState = clientData.state;
            clientData.state = "loading";
            Vue.set(state.connectedClients, idx, clientData);
        }
    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("clientreadytoplay", (clientId) => {
        // Set to ready state
        const idx = state.connectedClients.findIndex(data => data.id === clientId);
        if (idx >= 0) {
            const clientData = { ...state.connectedClients[idx] };
            clientData._prevState = clientData.state;
            clientData.state = "ready";
            Vue.set(state.connectedClients, idx, clientData);
        }
    });

    connectionManager.addEventListener("room-created", () => {
        // Add self
        Vue.set(state, "connectedClients", [connectionManager.id]);
        Vue.set(state, "isOwner", connectionManager.isOwner);
        Vue.set(state, "roomName", connectionManager.room);
        Vue.set(state, "timesynced", false);
    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("room-joined", ({ clients }) => {
        // Add other already connected clients + self
        Vue.set(state, "connectedClients", [...clients, connectionManager.id]);
        Vue.set(state, "isOwner", connectionManager.isOwner);
        Vue.set(state, "roomName", connectionManager.room);
        Vue.set(state, "timesynced", false);
    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("room-left", () => {
        // Reset state
        Vue.set(state, "connectedClients", []);
        Vue.set(state, "isOwner", false);
        Vue.set(state, "roomName", "");
        Vue.set(state, "timesynced", false);
    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("isconnectedchanged", (newIsConnected) => {
        Vue.set(state, "isConnected", newIsConnected);
    }, ROOM_STORE_TAG);

    connectionManager.addEventListener("timesyncchanged", (timesynced) => {
        Vue.set(state, "timesynced", timesynced);
    }, ROOM_STORE_TAG);
}

// ------------------
// --- Room Store ---
// ------------------

const namespaced = false;

const state: RoomState = {
    connectionManager: new ConnectionManager(uuid()),
    isConnected: false,
    isOwner: false,
    connectedClients: [],
    roomName: "",
    timesynced: false,
};

setupConnectionManagerListeners(state, state.connectionManager);

const getters: GetterTree<RoomState, RootState> = {
    [Getters.isConnected](state): boolean {
        return state.isConnected;
    },
    [Getters.isOwner](state): boolean {
        return state.isOwner;
    },
    [Getters.connectedClients](state): Client[] {
        return state.connectedClients;
    },
    [Getters.id](state): string | null {
        return state.connectionManager.id;
    },
    [Getters.connectionManager](state): ConnectionManager {
        return state.connectionManager;
    },
    [Getters.roomName](state): string {
        return state.roomName;
    },
    [Getters.timesynced](state): boolean {
        return state.timesynced;
    }
};

const mutations: MutationTree<RoomState> = {};

const actions: ActionTree<RoomState, RootState> = {};

const storeModule: Module<RoomState, RootState> = {
    namespaced,
    state,
    getters,
    mutations,
    actions
};

export default storeModule;