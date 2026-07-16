import React from 'react';

export default function PageBanner({ title, image }) {
  return (
    <div className="relative h-[250px] md:h-[300px] overflow-hidden" data-testid="page-banner">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image || 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800'})` }}
      />
      <div className="absolute inset-0 bg-[#1a2332]/70" />
      <div className="relative h-full flex items-center justify-center">
        <h1
          className="text-4xl md:text-5xl font-bold text-white"
          style={{ fontFamily: 'Playfair Display, serif' }}
          data-testid="page-banner-title"
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
