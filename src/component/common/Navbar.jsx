import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import ApiService from "../../service/ApiService";

const Navbar = () => {

    const navigate = useNavigate();

    const isAuthenticated = ApiService.isAuthenticated();    

    const handleLogout = () => {
        const confirm = window.confirm("로그아웃 하시겠습니까?");
        if (confirm) {
            ApiService.logout();
            setTimeout(() => {
                navigate('/login')
            }, 500);
        }
    }

    return (
        <nav className="navbar">
            <div className="navbar-link">                
                {!isAuthenticated && <NavLink to="/login" >로그인</NavLink>}
                {!isAuthenticated && <NavLink to="/register" >회원가입</NavLink>}
                {isAuthenticated && <NavLink onClick={handleLogout} >로그아웃</NavLink>}                
            </div>
        </nav>
    );
};
export default Navbar;