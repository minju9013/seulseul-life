import React from 'react';
import './AppBar.css';

function AppBar({ onSearchClick, searchHighlighted = false, onSignOut }) {
  return (
    <header className="app-bar">
      <div className="app-bar-inner">
        <div className="brand">
          <img
            src="/favicon-v2.png?v=2"
            alt=""
            aria-hidden="true"
            className="brand-icon"
          />
          <div className="brand-text">슬슬살게</div>
        </div>
        <div className="app-bar-actions">
          <button
            type="button"
            className={
              searchHighlighted ? 'app-bar-search-btn is-active' : 'app-bar-search-btn'
            }
            aria-label="검색"
            aria-expanded={searchHighlighted}
            onClick={onSearchClick}
          >
            <svg
              className="app-bar-search-icon"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
              <path
                d="M20 20l-4.3-4.3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {onSignOut && (
            <button
              type="button"
              className="app-bar-signout-btn"
              aria-label="로그아웃"
              onClick={onSignOut}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppBar;
