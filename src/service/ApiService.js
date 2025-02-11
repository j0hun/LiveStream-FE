import axios from "axios";

export default class ApiService {

    static BASE_URL = "http://localhost:8080/api";

    static getHeader() {
        const token = localStorage.getItem("token");
        return {
            Authorization : `Bearer ${token}`,
            "Content-Type" : "application/json"
        };
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

    static async addRoom(){
        const response = await axios.post(`${this.BASE_URL}/room`);
        return response.data;
    }

    static async getAllRooms(){
        const response = await axios.get(`${this.BASE_URL}/room`);
        return response.data;
    }

    static async getRoomById(roomId){
        const response = await axios.get(`${this.BASE_URL}/room/${roomId}`);
        return response.data;
    }

}