import React, { useState } from 'react'
import { MessageSquare, Heart, Reply, Plus, Filter, Search } from 'lucide-react'

const ForumPage = () => {
  const [activeFilter, setActiveFilter] = useState('all')

  const posts = [
    {
      id: 1,
      author: '0x1234...5678',
      title: 'Best strategies for Phase 2 transition?',
      content: 'Looking for advice on optimizing the transition to BTC accumulation phase. What factors should we consider?',
      timestamp: '2 hours ago',
      likes: 12,
      replies: 5,
      category: 'strategy'
    },
    {
      id: 2,
      author: '0x2345...6789',
      title: 'SubClub formation tips',
      content: 'Just created my first SubClub! Here are some lessons learned about member selection and rigor levels.',
      timestamp: '4 hours ago',
      likes: 8,
      replies: 3,
      category: 'tips'
    },
    {
      id: 3,
      author: '0x3456...7890',
      title: 'Gas optimization discussion',
      content: 'Has anyone noticed the recent gas optimizations? Transactions are much cheaper now.',
      timestamp: '1 day ago',
      likes: 15,
      replies: 7,
      category: 'technical'
    },
    {
      id: 4,
      author: '0x4567...8901',
      title: 'Emergency withdrawal experience',
      content: 'Had to use emergency withdrawal last week. Process was smooth but the 10% penalty hurts.',
      timestamp: '2 days ago',
      likes: 6,
      replies: 12,
      category: 'experience'
    }
  ]

  const categories = [
    { id: 'all', label: 'All Posts', count: posts.length },
    { id: 'strategy', label: 'Strategy', count: 1 },
    { id: 'tips', label: 'Tips', count: 1 },
    { id: 'technical', label: 'Technical', count: 1 },
    { id: 'experience', label: 'Experience', count: 1 }
  ]

  const filteredPosts = activeFilter === 'all' 
    ? posts 
    : posts.filter(post => post.category === activeFilter)

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Community Forum
        </h1>
        <p className="text-gray-600">
          Connect with other investors and share insights
        </p>
      </div>

      {/* Search and Create */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search discussions..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <button className="btn-primary w-full">
          <Plus className="w-5 h-5 mr-2" />
          Create New Post
        </button>
      </div>

      {/* Categories */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium">Categories</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveFilter(category.id)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === category.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <div key={post.id} className="card">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {post.author.slice(2, 4).toUpperCase()}
                </span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-800">
                    {post.author}
                  </span>
                  <span className="text-sm text-gray-500">
                    {post.timestamp}
                  </span>
                </div>
                
                <h3 className="font-semibold text-lg mb-2">
                  {post.title}
                </h3>
                
                <p className="text-gray-600 mb-4">
                  {post.content}
                </p>
                
                <div className="flex items-center space-x-6">
                  <button className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">{post.likes}</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 text-gray-500 hover:text-indigo-500 transition-colors">
                    <Reply className="w-4 h-4" />
                    <span className="text-sm">{post.replies} replies</span>
                  </button>
                  
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    post.category === 'strategy' ? 'bg-blue-100 text-blue-800' :
                    post.category === 'tips' ? 'bg-green-100 text-green-800' :
                    post.category === 'technical' ? 'bg-purple-100 text-purple-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {post.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Community Stats */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Community Stats</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-indigo-600">1,247</div>
            <div className="text-sm text-gray-500">Members</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">3,891</div>
            <div className="text-sm text-gray-500">Posts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">12,456</div>
            <div className="text-sm text-gray-500">Replies</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForumPage
