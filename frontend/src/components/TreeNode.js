import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

// Flatten tree into a renderable list with depth info
function flattenTree(nodes, depth, expandedMap) {
  const result = [];
  for (const node of nodes) {
    const hasKids = node.children && node.children.length > 0;
    result.push({ ...node, depth, hasKids });
    if (hasKids && expandedMap[node.member_id]) {
      result.push(...flattenTree(node.children, depth + 1, expandedMap));
    }
  }
  return result;
}

export default function CommunityTree({ tree, onSelect }) {
  const [expanded, setExpanded] = useState({});

  const toggle = useCallback((id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const flatList = flattenTree(tree, 0, expanded);

  return (
    <div>
      {flatList.map(node => {
        const initial = node.first_name ? node.first_name[0].toUpperCase() : '?';
        return (
          <div key={node.member_id} style={{ paddingLeft: node.depth * 20 }} className="flex items-center gap-2 py-1.5 group" data-testid={`tree-node-${node.membership_id}`}>
            {node.hasKids ? (
              <button onClick={() => toggle(node.member_id)} className="text-gray-500 hover:text-[#c9a84c] w-4 h-4 flex items-center justify-center flex-shrink-0">
                {expanded[node.member_id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : <span className="w-4 flex-shrink-0" />}
            <button onClick={() => onSelect(node)} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white">
              <div className="w-6 h-6 rounded-full bg-[#c9a84c]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#c9a84c] text-xs font-bold">{initial}</span>
              </div>
              <span className="text-[#c9a84c] font-mono text-xs">{node.membership_id}</span>
              <span>({node.first_name} {node.last_name})</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
