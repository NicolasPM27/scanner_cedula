#!/usr/bin/env ruby
require 'xcodeproj'

project_path = ARGV[0] || 'App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Remove all Swift Package references
if project.root_object.respond_to?(:package_references) && project.root_object.package_references
  project.root_object.package_references.clear
end

if project.root_object.respond_to?(:local_packages) && project.root_object.local_packages
  project.root_object.local_packages.clear
end

# Process each target
project.targets.each do |target|
  puts "Processing target: #{target.name}"
  
  # Remove package product dependencies
  if target.respond_to?(:package_product_dependencies) && target.package_product_dependencies
    target.package_product_dependencies.clear
    puts "  - Cleared package_product_dependencies"
  end
  
  # Remove from build phases
  target.build_phases.each do |phase|
    if phase.respond_to?(:files)
      files_to_remove = phase.files.select do |file|
        name = file.display_name rescue ''
        name.include?('CapApp-SPM') || name.include?('Capacitor') || name.include?('Cordova')
      end
      files_to_remove.each do |file|
        puts "  - Removing: #{file.display_name rescue 'unknown'}"
        file.remove_from_project rescue nil
      end
    end
  end
  
  # Clean dependencies
  if target.respond_to?(:dependencies)
    deps_to_remove = target.dependencies.select do |dep|
      name = dep.display_name rescue ''
      name.include?('CapApp-SPM') || name.include?('capacitor-swift-pm')
    end
    deps_to_remove.each do |dep|
      puts "  - Removing dependency: #{dep.display_name rescue 'unknown'}"
      target.dependencies.delete(dep)
    end
  end
end

# Remove CapApp-SPM from groups
project.groups.each do |group|
  group.recursive_children.each do |child|
    if child.respond_to?(:display_name)
      name = child.display_name rescue ''
      if name.include?('CapApp-SPM')
        puts "Removing group: #{name}"
        child.remove_from_project rescue nil
      end
    end
  end
end

project.save

puts "\n✅ SPM references removed from #{project_path}"
