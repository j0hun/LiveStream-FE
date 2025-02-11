import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../../service/ApiService";

const RegisterPage = () => {

    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phoneNumber: '',
        password: '',
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
            const response = await ApiService.registerUser(formData);
            if (response.status === 200) {
                setMessage("회원가입 성공");
                setTimeout(() => {
                    navigate("/login");
                }, 1000);
            }

        } catch (error) {
            setMessage(error);
        }
    }

    return (
        <div className="register-page">
            <h2>회원가입</h2>
            {message && <p className="message">{message}</p>}
            <form onSubmit={handleSubmit}>
                <label>이메일: </label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required />

                <label>이름: </label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required />
                
                <label>비밀번호: </label>
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required />
                    
                <button type="submit">회원가입</button>
                <p className="register-link">
                    이미 계정이 있나요? <a href="/login">로그인</a>
                </p>
            </form>
        </div>
    )

}

export default RegisterPage;