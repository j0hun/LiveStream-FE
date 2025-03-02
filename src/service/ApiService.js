import axios from "axios";

export default class ApiService {

    static BASE_URL = "http://localhost:8080/api";

    static getHeader() {
        const token = localStorage.getItem("token");
        if (token != null) {
            return {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            };
        }
    }

    static async registerUser(formData) {
        const response = await axios.post(`${this.BASE_URL}/register`, formData)
        return response.data;
    }

    static async loginUser(formData) {
        const response = await axios.post(`${this.BASE_URL}/login`, formData)
        return response.data;
    }

    static logout() {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
    }

    static isAuthenticated() {
        const token = localStorage.getItem('token')
        return !!token
    }

    static isAdmin() {
        const role = localStorage.getItem('role')
        return role === 'ADMIN'
    }

    static async addRoom() {
        const response = await axios.post(`${this.BASE_URL}/room`, {}, {
            headers: this.getHeader()
        });
        return response.data;
    }

    static async getAllRooms() {
        const response = await axios.get(`${this.BASE_URL}/room`);
        return response.data;
    }

    static async getRoomById(roomId) {
        const response = await axios.get(`${this.BASE_URL}/room/${roomId}`);
        return response.data;
    }

    static async checkBroadcaster(roomId) {
        const headers = this.isAuthenticated() ? { headers: this.getHeader() } : {};
        const response = await axios.get(`${this.BASE_URL}/room/${roomId}/checkBroadcaster`, headers);
        return response.data;
    }

    static async createRoom(sessionId, handleId, roomId) {
        const response = await axios.post(`${this.BASE_URL}/janus/create-room`, null, {
            params: { sessionId, handleId, roomId },
            headers: this.getHeader()
        });
        return response.data;
    }

    static async joinRoom(sessionId, handleId, roomId, display, ptype, feed) {
        const params = { sessionId, handleId, roomId, display, ptype, feed };
        const response = await axios.post(`${this.BASE_URL}/janus/join-room`, null, {
            params,
        });
        
        return response.data;
    }

    static async getPublishers(sessionId, handleId, roomId) {
        const params = { sessionId, handleId, roomId };
        const response = await axios.post(`${this.BASE_URL}/janus/get-publishers`, null, {
            params,
        });
        return response.data;
    }

    static async startStream() {
        const response = await axios.post(`${this.BASE_URL}/ams-stream/start`, null, null);
        return response.data;
    }

    static async geHlsUrl(streamId) {
        const response = await axios.get(`${this.BASE_URL}/ams-stream/hls/${streamId}`);
        return response.data;
    }

    static async getRTMPHlsUrl(streamId) {
        const response = await axios.get(`${this.BASE_URL}/stream/hls/${streamId}`);
        return response.data;
    }

}