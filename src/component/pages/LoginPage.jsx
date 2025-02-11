import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../../service/ApiService";


const LoginPage = () => {

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [message, setMessage] = useState(null);
    const navigate = useNavigate();


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await ApiService.loginUser(formData);
            console.log(response);
            if (response.status === 200) {
                setMessage("로그인 성공");
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('role', response.data.role);
                setTimeout(() => {
                    navigate("/")
                }, 1000)
            }
        } catch (error) {
            setMessage(error.response?.data.message || error.message);
        }
    }

    return (
        <div className="register-page">
            <h2>로그인</h2>
            {message && <p className="message">{message}</p>}
            <form onSubmit={handleSubmit}>
                <label>이메일: </label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required />

                <label>비밀번호: </label>
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required />

                <button type="submit">로그인</button>

                <p className="register-link">
                    계정이 없나요? <a href="/register">회원가입</a>
                </p>
            </form>
        </div>
    )
}

export default LoginPage;